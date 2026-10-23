-- =====================================================================
-- GUF APP · Painel: suspensão de contas, exclusão (imediata ou agendada), desvincular todos os
-- logins sociais e documentos pendentes no resumo da conta.
-- Documento: docs/admin-panel.md §1.5 · LGPD: .lgpd/ (A022 administração da conta)
--
-- Suspensão: account_bans guarda a intenção (prazo ou indeterminado, motivo) e auth.users.banned_until
-- é quem barra o login e a renovação do token no Supabase Auth. As sessões abertas são encerradas na
-- hora; o token de acesso já emitido vale até expirar (até 1 h).
-- Exclusão: a mesma do app (delete em auth.users → cascata, prova dos aceites e account_deleted pelos
-- gatilhos). Arquivos no Storage não saem em cascata: com foto enviada, a exclusão é recusada (GA015).
-- Contas da equipe nunca são suspensas nem excluídas pelo painel (GA014).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ações novas da auditoria
-- ---------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in (
    'consent_granted', 'consent_revoked', 'health_data_deleted', 'data_exported',
    'account_deleted', 'consent_proofs_purged', 'audit_log_purged',
    'social_data_deleted', 'social_visibility_changed', 'follow_accepted', 'follow_ended', 'user_blocked',
    'ai_conversations_purged', 'plan_granted', 'plan_revoked',
    'staff_viewed_user', 'staff_revealed_email', 'staff_changed_plan', 'staff_changed_handle',
    'staff_changed_name', 'staff_unlinked_identity',
    'staff_member_added', 'staff_member_role_changed', 'staff_member_disabled', 'staff_member_enabled',
    'announcement_published', 'announcement_ended', 'announcements_purged',
    'staff_banned_user', 'staff_unbanned_user', 'staff_deleted_account',
    'staff_scheduled_deletion', 'staff_cancelled_deletion', 'scheduled_deletion_executed'));

-- ---------------------------------------------------------------------
-- 2. Tabelas (sem política para o app: só as funções admin_* leem e gravam)
-- ---------------------------------------------------------------------
create table public.account_bans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  ends_at     timestamptz,                         -- null = indeterminado
  reason      text not null check (reason in ('titular_request', 'terms_violation', 'courtesy', 'other')),
  note        text check (note is null or char_length(note) <= 200),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  lifted_at   timestamptz,
  lifted_by   uuid references auth.users (id) on delete set null,
  check (ends_at is null or ends_at > created_at)
);
-- Uma suspensão aberta por conta (banir de novo encerra a anterior e abre outra).
create unique index account_bans_open_idx on public.account_bans (user_id) where lifted_at is null;
alter table public.account_bans enable row level security;

create table public.account_deletion_schedules (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  scheduled_for  timestamptz not null,
  reason         text not null check (reason in ('titular_request', 'terms_violation', 'courtesy', 'other')),
  note           text check (note is null or char_length(note) <= 200),
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  -- Último motivo de a execução não ter acontecido (ex.: account_has_files); a tela mostra.
  last_error     text
);
create index account_deletion_schedules_due_idx on public.account_deletion_schedules (scheduled_for);
alter table public.account_deletion_schedules enable row level security;

-- ---------------------------------------------------------------------
-- 3. Regras comuns
-- ---------------------------------------------------------------------
-- Conta existente, que não é de quem chama nem da equipe. Devolve a linha de auth.users.
create or replace function public.assert_account_actionable(p_user_id uuid)
returns auth.users
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user auth.users;
begin
  select * into v_user from auth.users u where u.id = p_user_id and u.deleted_at is null;
  if not found then
    raise exception 'Conta não encontrada' using errcode = 'GA004';
  end if;
  if p_user_id = (select auth.uid()) or exists (select 1 from public.staff_members s where s.user_id = p_user_id) then
    raise exception 'Conta da equipe' using errcode = 'GA014';
  end if;
  return v_user;
end;
$$;

create or replace function public.account_has_storage_files(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from storage.objects o where o.bucket_id = 'avatars' and o.name like p_user_id::text || '/%');
$$;

-- Apaga a conta (mesma cascata do "Excluir conta" do app). Quem chama já conferiu a permissão.
create or replace function public.delete_account_now(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if public.account_has_storage_files(p_user_id) then
    raise exception 'A conta tem arquivos no Storage' using errcode = 'GA015';
  end if;
  delete from auth.users u where u.id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Suspensão
-- ---------------------------------------------------------------------
-- p_ends_at nulo = indeterminado. Banir quem já está suspenso troca o prazo.
create or replace function public.admin_ban_user(p_user_id uuid, p_ends_at timestamptz, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('admin');
begin
  perform public.assert_account_actionable(p_user_id);
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if p_ends_at is not null and p_ends_at <= now() then
    raise exception 'Data no passado' using errcode = 'GA016';
  end if;

  update public.account_bans b set lifted_at = now(), lifted_by = v_staff.user_id
   where b.user_id = p_user_id and b.lifted_at is null;
  insert into public.account_bans (user_id, ends_at, reason, note, created_by)
  values (p_user_id, p_ends_at, p_reason, nullif(btrim(coalesce(p_note, '')), ''), v_staff.user_id);

  -- O Supabase Auth não aceita 'infinity': indeterminado = uma data que nunca chega.
  update auth.users u set banned_until = coalesce(p_ends_at, '2999-12-31 23:59:59+00') where u.id = p_user_id;
  delete from auth.sessions s where s.user_id = p_user_id;

  perform public.staff_audit('staff_banned_user', p_user_id, p_reason, p_note,
    jsonb_build_object('ends_at', p_ends_at));
end;
$$;

create or replace function public.admin_unban_user(p_user_id uuid, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('admin');
begin
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  update public.account_bans b set lifted_at = now(), lifted_by = v_staff.user_id
   where b.user_id = p_user_id and b.lifted_at is null and (b.ends_at is null or b.ends_at > now());
  if not found then
    raise exception 'Conta sem suspensão ativa' using errcode = 'GA012';
  end if;
  update auth.users u set banned_until = null where u.id = p_user_id;
  perform public.staff_audit('staff_unbanned_user', p_user_id, p_reason, p_note);
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Exclusão imediata e agendada
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_user(p_user_id uuid, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_staff('admin');
  perform public.assert_account_actionable(p_user_id);
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  -- Auditoria antes: o gatilho de auth.users grava account_deleted como ação da equipe em seguida.
  perform public.staff_audit('staff_deleted_account', p_user_id, p_reason, p_note);
  perform public.delete_account_now(p_user_id);
end;
$$;

create or replace function public.admin_schedule_deletion(p_user_id uuid, p_at timestamptz, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('admin');
begin
  perform public.assert_account_actionable(p_user_id);
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if p_at is null or p_at <= now() then
    raise exception 'Data no passado' using errcode = 'GA016';
  end if;

  insert into public.account_deletion_schedules (user_id, scheduled_for, reason, note, created_by)
  values (p_user_id, p_at, p_reason, nullif(btrim(coalesce(p_note, '')), ''), v_staff.user_id)
  on conflict (user_id) do update
     set scheduled_for = excluded.scheduled_for, reason = excluded.reason, note = excluded.note,
         created_by = excluded.created_by, created_at = now(), last_error = null;

  perform public.staff_audit('staff_scheduled_deletion', p_user_id, p_reason, p_note,
    jsonb_build_object('scheduled_for', p_at));
  -- Transparência (Art. 6º, VI) e tempo para exportar os dados antes.
  perform public.notify_account_change(p_user_id, 'Sua conta será excluída',
    'A equipe do guf agendou a exclusão da sua conta para '
      || to_char(p_at at time zone 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI')
      || '. Para guardar seus dados, use Configurações › Privacidade › Exportar. Dúvidas? Fale com o suporte.');
end;
$$;

create or replace function public.admin_cancel_deletion(p_user_id uuid, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_staff('admin');
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  delete from public.account_deletion_schedules d where d.user_id = p_user_id;
  if not found then
    raise exception 'Sem exclusão agendada' using errcode = 'GA012';
  end if;
  perform public.staff_audit('staff_cancelled_deletion', p_user_id, p_reason, p_note);
end;
$$;

-- Job (pg_cron): executa as exclusões vencidas. Uma conta que falha não trava as outras.
create or replace function public.execute_scheduled_account_deletions()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_due record;
begin
  for v_due in
    select d.user_id, d.reason, d.created_by from public.account_deletion_schedules d
     where d.scheduled_for <= now()
     order by d.scheduled_for
     limit 200
  loop
    begin
      perform public.audit_log_append('scheduled_deletion_executed', v_due.user_id,
        jsonb_build_object('reason', v_due.reason, 'scheduled_by', v_due.created_by));
      perform public.delete_account_now(v_due.user_id);
    exception when others then
      update public.account_deletion_schedules d
         set last_error = case when sqlstate = 'GA015' then 'account_has_files' else 'unknown' end
       where d.user_id = v_due.user_id;
    end;
  end loop;
end;
$$;

select cron.schedule(
  'execute-scheduled-account-deletions',
  '*/10 * * * *',                                   -- a cada 10 minutos
  $$select public.execute_scheduled_account_deletions()$$
);

-- ---------------------------------------------------------------------
-- 6. Desvincular todos os logins sociais (ações em lote): atômico por conta; sem senha → GA006.
-- ---------------------------------------------------------------------
create or replace function public.admin_unlink_social_identities(p_user_id uuid, p_note text default null)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_provider text;
  v_count    integer := 0;
begin
  perform public.require_staff('support');
  for v_provider in
    select distinct i.provider from auth.identities i where i.user_id = p_user_id and i.provider <> 'email'
  loop
    perform public.admin_unlink_identity(p_user_id, v_provider, p_note);
    v_count := v_count + 1;
  end loop;
  if v_count = 0 then
    raise exception 'Sem login social' using errcode = 'GA012';
  end if;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Busca e resumo da conta com suspensão, exclusão agendada e documentos pendentes
-- ---------------------------------------------------------------------
create or replace function public.active_ban_of(p_user_id uuid)
returns public.account_bans
language sql stable security definer
set search_path = ''
as $$
  select * from public.account_bans b
   where b.user_id = p_user_id and b.lifted_at is null and (b.ends_at is null or b.ends_at > now())
   limit 1;
$$;

drop function public.admin_search_users(text, integer);
create function public.admin_search_users(p_query text, p_limit integer default 25)
returns table (
  user_id uuid, name text, handle text, masked_email text, plan_code text, plan_name text,
  plan_is_default boolean, created_at timestamptz, visibility text,
  is_banned boolean, ban_ends_at timestamptz, deletion_scheduled_for timestamptz
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_q      text := btrim(coalesce(p_query, ''));
  v_like   text;
  v_handle text := public.normalize_handle(p_query);
  v_limit  integer := least(greatest(coalesce(p_limit, 25), 1), 50);
  v_id     uuid;
begin
  perform public.require_staff('viewer');
  if char_length(v_q) < 2 then
    return;
  end if;
  v_like := replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_');
  if v_q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_id := v_q::uuid;
  end if;

  return query
  select u.id, p.name, sp.handle, public.mask_email(u.email::text), pl.code, pl.name, pl.is_default,
         u.created_at, coalesce(sp.visibility, 'private'),
         b.id is not null, b.ends_at, d.scheduled_for
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.social_profiles sp on sp.user_id = u.id
    left join public.account_bans b on b.user_id = u.id and b.lifted_at is null and (b.ends_at is null or b.ends_at > now())
    left join public.account_deletion_schedules d on d.user_id = u.id
    join public.plans pl on pl.code = public.plan_of(u.id)
   where u.deleted_at is null
     and (
       u.id = v_id
       or (position('@' in v_q) > 1 and lower(u.email) = lower(v_q))
       or (char_length(v_handle) >= 2 and sp.handle like replace(replace(v_handle, '_', '\_'), '%', '\%') || '%')
       or p.name ilike v_like || '%'
       or p.name ilike '% ' || v_like || '%'
     )
   order by u.created_at desc, u.id
   limit v_limit;
end;
$$;

-- documents: um item por documento vigente do cadastro e da assinatura, aceito ou não
-- (status accepted · outdated · not_accepted; mesma regra de pending_documents_of).
create or replace function public.admin_get_user(p_user_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff  public.staff_members := public.require_staff('viewer');
  v_user   auth.users;
  v_ban    public.account_bans;
  v_result jsonb;
begin
  select * into v_user from auth.users u where u.id = p_user_id and u.deleted_at is null;
  if not found then
    raise exception 'Conta não encontrada' using errcode = 'GA004';
  end if;
  v_ban := public.active_ban_of(v_user.id);

  select jsonb_build_object(
    'id', v_user.id,
    'name', p.name,
    'handle', sp.handle,
    'visibility', coalesce(sp.visibility, 'private'),
    'masked_email', public.mask_email(v_user.email::text),
    'created_at', v_user.created_at,
    'last_sign_in_at', v_user.last_sign_in_at,
    'has_password', coalesce(v_user.encrypted_password, '') <> '',
    'is_staff', exists (select 1 from public.staff_members s where s.user_id = v_user.id),
    'logins', coalesce((select jsonb_agg(jsonb_build_object('provider', i.provider, 'created_at', i.created_at) order by i.created_at)
                          from auth.identities i where i.user_id = v_user.id), '[]'),
    'plan', (select jsonb_build_object('code', pl.code, 'name', pl.name, 'is_default', pl.is_default)
               from public.plans pl where pl.code = public.plan_of(v_user.id)),
    'plan_grants', coalesce((select jsonb_agg(jsonb_build_object(
                       'id', g.id, 'plan_code', g.plan_code, 'plan_name', pl.name, 'source', g.source,
                       'valid_from', g.valid_from, 'valid_until', g.valid_until, 'revoked_at', g.revoked_at) order by g.created_at desc)
                       from (select * from public.plan_grants g0 where g0.user_id = v_user.id order by g0.created_at desc limit 20) g
                       join public.plans pl on pl.code = g.plan_code), '[]'),
    'followers', (select count(*) from public.follows f where f.followee_id = v_user.id and f.status = 'accepted'),
    'following', (select count(*) from public.follows f where f.follower_id = v_user.id and f.status = 'accepted'),
    'workouts', (select count(*) from public.workout_sessions w where w.user_id = v_user.id and w.status = 'completed'),
    'documents', coalesce((select jsonb_agg(jsonb_build_object(
                     'doc_type', cur.doc_type,
                     'current_version', cur.version,
                     'accepted_version', acc.version,
                     'accepted_at', acc.created_at,
                     'status', case
                                 when acc.version is null then 'not_accepted'
                                 when acc.published_at >= coalesce(
                                        (select max(r.published_at) from public.legal_documents r
                                          where r.doc_type = cur.doc_type and r.requires_reaccept), '-infinity'::timestamptz)
                                   then 'accepted'
                                 else 'outdated' end) order by array_position(array['terms', 'privacy', 'age_declaration', 'subscription_terms'], cur.doc_type))
                   from (select (public.current_legal_document(t)).* from unnest(array['terms', 'privacy', 'age_declaration', 'subscription_terms']) as t) cur
                   left join lateral (
                     select ld.version, ld.published_at, c.created_at
                       from public.consent_records c
                       join public.legal_documents ld on ld.id = c.document_id
                      where c.user_id = v_user.id and c.action = 'granted' and ld.doc_type = cur.doc_type
                      order by ld.published_at desc, c.created_at desc
                      limit 1) acc on true
                  where cur.id is not null), '[]'),
    'health_consent', case when public.staff_role_rank(v_staff.role) >= 2 then public.has_health_consent_of(v_user.id) end,
    'ban', case when v_ban.id is null then null
                else jsonb_build_object('ends_at', v_ban.ends_at, 'reason', v_ban.reason, 'note', v_ban.note, 'created_at', v_ban.created_at) end,
    'deletion', (select jsonb_build_object('scheduled_for', d.scheduled_for, 'reason', d.reason, 'note', d.note,
                                           'created_at', d.created_at, 'last_error', d.last_error)
                   from public.account_deletion_schedules d where d.user_id = v_user.id),
    'staff_activity', coalesce((select jsonb_agg(jsonb_build_object(
                         'id', a.id, 'occurred_at', a.occurred_at, 'staff_name', coalesce(s.display_name, 'Equipe'),
                         'action', a.action, 'details', a.details) order by a.id desc)
                         from (select * from public.audit_log a0
                                where a0.subject_id = v_user.id and a0.actor_type = 'staff'
                                  and a0.action like 'staff\_%' and a0.action <> 'staff_viewed_user'
                                order by a0.id desc limit 20) a
                         left join public.staff_members s on s.user_id = a.actor_id), '[]')
  ) into v_result
  from (select 1) one
  left join public.profiles p on p.id = v_user.id
  left join public.social_profiles sp on sp.user_id = v_user.id;

  perform public.staff_audit('staff_viewed_user', v_user.id, null, null);
  return v_result;
end;
$$;

-- Auditoria: inclui as exclusões agendadas executadas pelo job (autor "Sistema").
create or replace function public.admin_list_audit(
  p_actor_id uuid default null, p_action text default null, p_from timestamptz default null,
  p_subject text default null, p_before_id bigint default null, p_limit integer default 30
)
returns table (
  id bigint, occurred_at timestamptz, actor_id uuid, actor_name text, action text,
  subject_id uuid, subject_label text, details jsonb
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_handle  text := public.normalize_handle(p_subject);
begin
  perform public.require_staff('admin');
  return query
  select a.id, a.occurred_at, a.actor_id,
         coalesce(actor.display_name, case when a.actor_type = 'service' then 'Sistema' else 'Equipe' end),
         a.action, a.subject_id,
         coalesce(subject_staff.display_name, case when sp.handle is not null then '@' || sp.handle end, p.name, 'Conta excluída'),
         a.details
    from public.audit_log a
    left join public.staff_members actor on actor.user_id = a.actor_id
    left join public.staff_members subject_staff on subject_staff.user_id = a.subject_id
    left join public.social_profiles sp on sp.user_id = a.subject_id
    left join public.profiles p on p.id = a.subject_id
   where (a.actor_type = 'staff' or a.action like 'staff\_member\_%' or a.action like 'announcement%'
          or a.action = 'scheduled_deletion_executed')
     and (p_actor_id is null or a.actor_id = p_actor_id)
     and (p_action is null or a.action = p_action)
     and (p_from is null or a.occurred_at >= p_from)
     and (p_before_id is null or a.id < p_before_id)
     and (v_subject is null
          or a.subject_id::text = v_subject
          or sp.handle like v_handle || '%'
          or p.name ilike '%' || v_subject || '%'
          or subject_staff.display_name ilike '%' || v_subject || '%')
   order by a.id desc
   limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Permissões
-- ---------------------------------------------------------------------
revoke execute on function
  public.assert_account_actionable(uuid),
  public.account_has_storage_files(uuid),
  public.delete_account_now(uuid),
  public.active_ban_of(uuid),
  public.execute_scheduled_account_deletions()
  from public, anon, authenticated;

revoke execute on function
  public.admin_search_users(text, integer),
  public.admin_ban_user(uuid, timestamptz, text, text),
  public.admin_unban_user(uuid, text, text),
  public.admin_delete_user(uuid, text, text),
  public.admin_schedule_deletion(uuid, timestamptz, text, text),
  public.admin_cancel_deletion(uuid, text, text),
  public.admin_unlink_social_identities(uuid, text)
  from public, anon;

grant execute on function
  public.admin_search_users(text, integer),
  public.admin_ban_user(uuid, timestamptz, text, text),
  public.admin_unban_user(uuid, text, text),
  public.admin_delete_user(uuid, text, text),
  public.admin_schedule_deletion(uuid, timestamptz, text, text),
  public.admin_cancel_deletion(uuid, text, text),
  public.admin_unlink_social_identities(uuid, text)
  to authenticated;
