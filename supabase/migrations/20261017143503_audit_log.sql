-- =====================================================================
-- GUF APP · Registro de auditoria (LGPD) — F6 da auditoria (.lgpd/), G19
--
-- Prova de que as ações do titular foram registradas e atendidas (Art. 6º, X —
-- responsabilização e prestação de contas). Só inclusão, encadeado por hash
-- (qualquer alteração ou remoção no meio quebra a cadeia: verify_audit_log()).
--
-- Eventos (gravados por gatilhos/funções do banco, nunca pelo app):
--   consent_granted / consent_revoked  → toda inclusão em consent_records
--   health_data_deleted                → medidas apagadas (revogação ou exclusão da conta)
--   data_exported                      → export_my_data()
--   account_deleted                    → antes de apagar auth.users
--   consent_proofs_purged / audit_log_purged → eliminação automática ao fim do prazo
--
-- Minimização: sem e-mail, nome, IP ou conteúdo dos dados. Só ids internos (uuid,
-- sem FK: o registro sobrevive à exclusão da conta), tipo do evento e contagens.
-- Retenção: 5 anos (alinhado ao prazo da prova de consentimento) ⚖.
-- Sem acesso pelo app (RLS ligado, nenhuma política); consulta só pelo controlador.
-- =====================================================================

create table public.audit_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default clock_timestamp(),
  actor_type   text not null check (actor_type in ('user', 'service', 'system')),
  actor_id     uuid,                        -- auth.uid() de quem agiu (null = serviço/sistema)
  subject_id   uuid,                        -- titular afetado (sem FK)
  action       text not null check (action in (
                 'consent_granted', 'consent_revoked', 'health_data_deleted', 'data_exported',
                 'account_deleted', 'consent_proofs_purged', 'audit_log_purged')),
  details      jsonb not null default '{}', -- só metadados mínimos (tipos, versões, contagens)
  payload_hash text not null,               -- SHA-256 de details
  prev_hash    text,                        -- self_hash do registro anterior
  self_hash    text not null unique
);

create index audit_log_subject_idx on public.audit_log (subject_id, occurred_at);
create index audit_log_action_idx  on public.audit_log (action, occurred_at);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;

-- Hash de um registro (mesma regra na gravação e na verificação)
create or replace function public.audit_log_hash(
  p_prev_hash text, p_occurred_at timestamptz, p_action text,
  p_actor_id uuid, p_subject_id uuid, p_payload_hash text
)
returns text
language sql immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(concat_ws('|',
    coalesce(p_prev_hash, ''),
    (extract(epoch from p_occurred_at) * 1000000)::bigint::text,   -- microssegundos (independe do fuso)
    p_action,
    coalesce(p_actor_id::text, ''),
    coalesce(p_subject_id::text, ''),
    p_payload_hash
  ), 'UTF8')), 'hex');
$$;

-- Inclui um evento no fim da cadeia (serializado por trava de transação)
create or replace function public.audit_log_append(p_action text, p_subject_id uuid, p_details jsonb default '{}')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor   uuid := (select auth.uid());
  v_at      timestamptz := clock_timestamp();
  v_details jsonb := coalesce(p_details, '{}');
  v_payload text;
  v_prev    text;
begin
  perform pg_advisory_xact_lock(hashtext('public.audit_log'));

  select a.self_hash into v_prev from public.audit_log a order by a.id desc limit 1;
  v_payload := encode(sha256(convert_to(v_details::text, 'UTF8')), 'hex');

  insert into public.audit_log (occurred_at, actor_type, actor_id, subject_id, action, details, payload_hash, prev_hash, self_hash)
  values (
    v_at,
    case when v_actor is not null then 'user'
         when p_action in ('consent_proofs_purged', 'audit_log_purged') then 'system'
         else 'service' end,
    v_actor, p_subject_id, p_action, v_details, v_payload, v_prev,
    public.audit_log_hash(v_prev, v_at, p_action, v_actor, p_subject_id, v_payload)
  );
end;
$$;

-- Confere a cadeia inteira. Retorna o 1º registro quebrado (null = íntegra).
-- O primeiro registro restante (após eliminação por prazo) é a âncora.
create or replace function public.verify_audit_log()
returns table (checked bigint, first_broken_id bigint)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  r       record;
  v_prev  text;
  v_first boolean := true;
  v_count bigint := 0;
begin
  for r in select * from public.audit_log order by id loop
    v_count := v_count + 1;
    if r.payload_hash <> encode(sha256(convert_to(r.details::text, 'UTF8')), 'hex')
       or (not v_first and r.prev_hash is distinct from v_prev)
       or r.self_hash <> public.audit_log_hash(r.prev_hash, r.occurred_at, r.action, r.actor_id, r.subject_id, r.payload_hash) then
      checked := v_count; first_broken_id := r.id;
      return next; return;
    end if;
    v_prev := r.self_hash;
    v_first := false;
  end loop;
  checked := v_count; first_broken_id := null;
  return next;
end;
$$;

-- Nunca editar; apagar só pela eliminação por prazo (purge_expired_audit_log)
create or replace function public.audit_log_block_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' or coalesce(current_setting('guf.audit_purge', true), '') <> 'on' then
    raise exception 'audit_log é somente inclusão' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.audit_log_block_changes();

-- ---------------------------------------------------------------------
-- Gatilhos dos eventos
-- ---------------------------------------------------------------------

-- Consentimentos (cadastro, /aceite, saúde, revogação)
create or replace function public.audit_consent_record()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_doc public.legal_documents;
begin
  select * into v_doc from public.legal_documents d where d.id = new.document_id;
  perform public.audit_log_append(
    'consent_' || new.action,
    new.user_id,
    jsonb_build_object('document', v_doc.doc_type, 'version', v_doc.version, 'source', new.source, 'platform', new.platform, 'record_id', new.id)
  );
  return null;
end;
$$;

create trigger consent_records_audit
  after insert on public.consent_records
  for each row execute function public.audit_consent_record();

-- Medidas apagadas (uma entrada por titular e operação, com a contagem)
create or replace function public.audit_measurements_deleted()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select o.user_id, count(*) as n from old_rows o group by o.user_id loop
    perform public.audit_log_append('health_data_deleted', r.user_id, jsonb_build_object('measurements', r.n));
  end loop;
  return null;
end;
$$;

create trigger body_measurements_audit_delete
  after delete on public.body_measurements
  referencing old table as old_rows
  for each statement execute function public.audit_measurements_deleted();

-- Exclusão da conta (antes da cascata)
create or replace function public.audit_account_deleted()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.audit_log_append(
    'account_deleted',
    old.id,
    jsonb_build_object(
      'providers',       old.raw_app_meta_data -> 'providers',
      'account_age_days', (current_date - old.created_at::date),
      'consent_records', (select count(*) from public.consent_records c where c.user_id = old.id)
    )
  );
  return old;
end;
$$;

create trigger on_auth_user_deleted_audit
  before delete on auth.users
  for each row execute function public.audit_account_deleted();

-- ---------------------------------------------------------------------
-- Exportação: mesma função da migration export_my_data_complete, agora VOLATILE
-- (grava o evento). Sem mudança no conteúdo exportado.
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  v_result := jsonb_build_object(
    'formato',                   'guf-export/2',
    'exportado_em',              now(),
    'conta',                     (select jsonb_build_object(
                                     'id',                  u.id,
                                     'email',               u.email,
                                     'criada_em',           u.created_at,
                                     'email_confirmado_em', u.email_confirmed_at,
                                     'ultimo_acesso_em',    u.last_sign_in_at,
                                     'provedores',          u.raw_app_meta_data -> 'providers',
                                     'dados_do_cadastro',   u.raw_user_meta_data
                                   )
                                    from auth.users u where u.id = v_uid),
    'contas_vinculadas',         (select coalesce(jsonb_agg(jsonb_build_object(
                                     'provedor',         i.provider,
                                     'dados_recebidos',  i.identity_data,
                                     'vinculada_em',     i.created_at,
                                     'ultimo_acesso_em', i.last_sign_in_at
                                   ) order by i.created_at), '[]')
                                    from auth.identities i where i.user_id = v_uid),
    'perfil',                    (select to_jsonb(p) from public.profiles p where p.id = v_uid),
    'plano',                     (select to_jsonb(e) from public.entitlements e where e.user_id = v_uid),
    'exercicios_personalizados', (select coalesce(jsonb_agg(e), '[]') from public.exercises e where e.user_id = v_uid),
    'projetos',                  (select coalesce(jsonb_agg(p), '[]') from public.projects p where p.user_id = v_uid),
    'rotinas',                   (select coalesce(jsonb_agg(r), '[]') from public.routines r where r.user_id = v_uid),
    'exercicios_das_rotinas',    (select coalesce(jsonb_agg(re), '[]') from public.routine_exercises re where re.user_id = v_uid),
    'treinos',                   (select coalesce(jsonb_agg(s), '[]') from public.workout_sessions s where s.user_id = v_uid),
    'periodos_ativos',           (select coalesce(jsonb_agg(ap order by ap.started_at), '[]') from public.workout_active_periods ap where ap.user_id = v_uid),
    'exercicios_dos_treinos',    (select coalesce(jsonb_agg(se), '[]') from public.session_exercises se where se.user_id = v_uid),
    'series',                    (select coalesce(jsonb_agg(sl), '[]') from public.set_logs sl where sl.user_id = v_uid),
    'medidas',                   (select coalesce(jsonb_agg(m), '[]') from public.body_measurements m where m.user_id = v_uid),
    'valores_das_medidas',       (select coalesce(jsonb_agg(v), '[]') from public.measurement_values v where v.user_id = v_uid),
    'consentimentos',            (select coalesce(jsonb_agg(jsonb_build_object(
                                     'id',             c.id,
                                     'documento',      d.doc_type,
                                     'versao',         d.version,
                                     'hash_do_texto',  d.content_hash,
                                     'acao',           c.action,
                                     'origem',         c.source,
                                     'plataforma',     c.platform,
                                     'registrado_em',  c.created_at
                                   ) order by c.created_at), '[]')
                                    from public.consent_records c
                                    join public.legal_documents d on d.id = c.document_id
                                   where c.user_id = v_uid)
  );

  perform public.audit_log_append('data_exported', v_uid, jsonb_build_object(
    'format', 'guf-export/2',
    'workouts', jsonb_array_length(v_result -> 'treinos'),
    'measurements', jsonb_array_length(v_result -> 'medidas')
  ));

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- Eliminação por prazo (Art. 16) com registro do próprio evento
-- ---------------------------------------------------------------------
create or replace function public.purge_expired_consent_proofs()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.consent_proofs where purge_after <= now();
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform public.audit_log_append('consent_proofs_purged', null, jsonb_build_object('rows', v_count));
  end if;
  return v_count;
end;
$$;

create or replace function public.purge_expired_audit_log()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('guf.audit_purge', 'on', true);
  delete from public.audit_log where occurred_at < now() - interval '5 years';
  get diagnostics v_count = row_count;
  perform set_config('guf.audit_purge', 'off', true);
  if v_count > 0 then
    perform public.audit_log_append('audit_log_purged', null, jsonb_build_object('rows', v_count));
  end if;
  return v_count;
end;
$$;

select cron.schedule(
  'purge-expired-audit-log',
  '41 3 1 * *',                                     -- dia 1 de cada mês, 03:41 UTC
  $$select public.purge_expired_audit_log()$$
);

-- ---------------------------------------------------------------------
-- Permissões: nada disto é chamado pelo app, exceto export_my_data
-- ---------------------------------------------------------------------
revoke execute on function
  public.audit_log_hash(text, timestamptz, text, uuid, uuid, text),
  public.audit_log_append(text, uuid, jsonb),
  public.verify_audit_log(),
  public.audit_log_block_changes(),
  public.audit_consent_record(),
  public.audit_measurements_deleted(),
  public.audit_account_deleted(),
  public.purge_expired_consent_proofs(),
  public.purge_expired_audit_log()
from public, anon, authenticated;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
