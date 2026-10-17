-- =====================================================================
-- GUF APP · Registro de consentimentos (LGPD) — F3 da auditoria (.lgpd/)
--
-- G13 · Registro fechado: o app não grava mais direto em consent_records.
--       Só as funções accept_documents, grant_health_consent e revoke_health_consent
--       (SECURITY DEFINER, com origem e plataforma validadas) e o gatilho de cadastro.
-- G6  · Prova após a exclusão da conta: antes de apagar o usuário, um gatilho copia
--       os aceites para consent_proofs (sem dados de treino nem de medidas), com o
--       e-mail só em hash SHA-256. Guardada por 5 anos e apagada por job diário.
--       Base proposta: Art. 7º, VI e Art. 16, I (exercício regular de direitos;
--       ônus da prova do Art. 8º, § 2º). PRAZO E BASE A VALIDAR COM O JURÍDICO.
-- G14 · Hash dos textos: os rascunhos 0.1-dev recebem o hash real do texto do app
--       (packages/core/src/legal-hash.ts · pnpm --filter @guf/core legal:hashes).
-- =====================================================================

-- ---------------------------------------------------------------------
-- G13 · Fechar consent_records para escrita direta
-- ---------------------------------------------------------------------
drop policy if exists "consentimentos: incluir os próprios" on public.consent_records;

revoke insert, update, delete, truncate on public.consent_records from anon, authenticated;

-- Registrar aceite de documentos (cadastro, portão /aceite)
create or replace function public.accept_documents(
  p_document_ids uuid[],
  p_source text,
  p_platform text default 'web'
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_ids uuid[];
  v_valid_count integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_source is null or p_source not in ('signup_email', 'signup_google', 'reaccept') then
    raise exception 'Origem do aceite inválida' using errcode = '22023';
  end if;
  if p_platform is not null and p_platform not in ('web', 'ios', 'android') then
    raise exception 'Plataforma inválida' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct doc_id), '{}') into v_ids
    from unnest(p_document_ids) as doc_id;

  if cardinality(v_ids) = 0 then
    raise exception 'Nenhum documento informado' using errcode = '22023';
  end if;

  select count(*) into v_valid_count
    from unnest(v_ids) as doc_id
   where doc_id in (
           select (public.current_legal_document(t)).id
             from unnest(array['terms', 'privacy', 'age_declaration']) as t
         );

  if v_valid_count <> cardinality(v_ids) then
    raise exception 'Documento inválido ou desatualizado' using errcode = '22023';
  end if;

  insert into public.consent_records (user_id, document_id, action, source, platform)
  select v_uid, doc_id, 'granted', p_source, p_platform
    from unnest(v_ids) as doc_id;
end;
$$;

-- Conceder consentimento de saúde (módulo de medidas)
create or replace function public.grant_health_consent(p_platform text default 'web')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_doc uuid := (public.current_legal_document('health_consent')).id;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_platform is not null and p_platform not in ('web', 'ios', 'android') then
    raise exception 'Plataforma inválida' using errcode = '22023';
  end if;
  if v_doc is null then
    raise exception 'Termo de saúde não publicado' using errcode = '22023';
  end if;

  insert into public.consent_records (user_id, document_id, action, source, platform)
  values (v_uid, v_doc, 'granted', 'health_module', p_platform);
end;
$$;

-- Revogar consentimento de saúde E apagar todas as medidas (operação única)
create or replace function public.revoke_health_consent(p_platform text default 'web')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_doc uuid := (public.current_legal_document('health_consent')).id;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_platform is not null and p_platform not in ('web', 'ios', 'android') then
    raise exception 'Plataforma inválida' using errcode = '22023';
  end if;

  if v_doc is not null then
    insert into public.consent_records (user_id, document_id, action, source, platform)
    values (v_uid, v_doc, 'revoked', 'settings', p_platform);
  end if;

  delete from public.body_measurements where user_id = v_uid;   -- cascata apaga os valores
end;
$$;

revoke execute on function
  public.accept_documents(uuid[], text, text),
  public.grant_health_consent(text),
  public.revoke_health_consent(text)
from public, anon;

grant execute on function
  public.accept_documents(uuid[], text, text),
  public.grant_health_consent(text),
  public.revoke_health_consent(text)
to authenticated;

-- ---------------------------------------------------------------------
-- G6 · Prova mínima dos consentimentos após a exclusão da conta
-- Sem acesso pelo app (RLS ligado e nenhuma política). Consulta só pelo
-- controlador, no SQL, para responder a um questionamento do titular ou da ANPD.
-- ---------------------------------------------------------------------
create table public.consent_proofs (
  id                 uuid primary key default gen_random_uuid(),
  original_record_id uuid not null unique,          -- consent_records.id (apagado com a conta)
  former_user_id     uuid not null,                 -- id da conta excluída (sem FK: não aponta para mais nada)
  email_sha256       text,                          -- SHA-256 de lower(trim(e-mail)); o e-mail não é guardado
  document_id        uuid not null references public.legal_documents (id) on delete restrict,
  doc_type           text not null,
  doc_version        text not null,
  content_hash       text not null,
  summary_hash       text,
  action             text not null check (action in ('granted', 'revoked')),
  source             text not null,
  platform           text,
  consented_at       timestamptz not null,          -- consent_records.created_at
  account_deleted_at timestamptz not null default now(),
  purge_after        timestamptz not null default now() + interval '5 years'
);

create index consent_proofs_email_idx on public.consent_proofs (email_sha256);
create index consent_proofs_purge_idx on public.consent_proofs (purge_after);

alter table public.consent_proofs enable row level security;
revoke all on public.consent_proofs from anon, authenticated;

-- Copia os aceites ANTES de apagar o usuário (a cascata apaga consent_records depois).
-- Vale para qualquer exclusão: Edge Function delete-account, painel ou SQL.
create or replace function public.preserve_consent_proofs()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email_hash text;
begin
  if nullif(trim(old.email), '') is not null then
    v_email_hash := encode(sha256(convert_to(lower(trim(old.email)), 'UTF8')), 'hex');
  end if;

  insert into public.consent_proofs (
    original_record_id, former_user_id, email_sha256, document_id, doc_type, doc_version,
    content_hash, summary_hash, action, source, platform, consented_at
  )
  select c.id, c.user_id, v_email_hash, d.id, d.doc_type, d.version,
         d.content_hash, d.summary_hash, c.action, c.source, c.platform, c.created_at
    from public.consent_records c
    join public.legal_documents d on d.id = c.document_id
   where c.user_id = old.id
  on conflict (original_record_id) do nothing;

  return old;
end;
$$;

create trigger on_auth_user_deleted_preserve_consents
  before delete on auth.users
  for each row execute function public.preserve_consent_proofs();

-- Eliminação ao fim do prazo (Art. 16)
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
  return v_count;
end;
$$;

revoke execute on function
  public.preserve_consent_proofs(),
  public.purge_expired_consent_proofs()
from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'purge-expired-consent-proofs',
  '17 3 * * *',                                     -- todo dia, 03:17 UTC
  $$select public.purge_expired_consent_proofs()$$
);

-- ---------------------------------------------------------------------
-- G14 · Hash real dos textos provisórios (só onde ainda há o marcador de desenvolvimento)
-- Versões definitivas entram em nova migration, com o hash gerado pelo script.
-- ---------------------------------------------------------------------
update public.legal_documents set content_hash = '243ecd1d767616d1be361a63bc94a93f1874579355bd96b2470a4fd19405d46f'
 where doc_type = 'terms' and version = '0.1-dev' and content_hash = 'DEV-PLACEHOLDER';

update public.legal_documents set content_hash = 'ff99000fe2d894ab7ba26da2f25f2f46be700d7374e0256385605ced5c86f0db'
 where doc_type = 'privacy' and version = '0.1-dev' and content_hash = 'DEV-PLACEHOLDER';

update public.legal_documents set content_hash = 'b182957f46f0d2953582d727b248393359438064f3d14969c69b97a64d756872'
 where doc_type = 'age_declaration' and version = '0.1-dev' and content_hash = 'DEV-PLACEHOLDER';

update public.legal_documents
   set content_hash = 'e24870b033a46f770afb42090a16293d718ef2ad7a6f18ee7f5867f614e20ac9',
       summary_hash = '07f48747dd2361e7e9a433c3f5230381961c666ca536bd1b403e7e275001b31f'
 where doc_type = 'health_consent' and version = '0.1-dev' and content_hash = 'DEV-PLACEHOLDER';
