-- =====================================================================
-- GUF APP · Painel de administração (apps/admin) e comunicados no app
-- Documento: docs/admin-panel.md · LGPD: .lgpd/ (A022 administração da conta, A023 comunicados)
--
-- Segurança:
--  - Colaboradores em staff_members (viewer · support · admin). Nenhuma tabela nova tem política
--    para o app: o painel lê e grava SÓ pelas funções admin_* (SECURITY DEFINER), que chamam
--    require_staff() → colaborador ativo + segundo fator (aal2) + papel mínimo.
--  - O papel é lido da tabela a cada chamada (não do token): desativar ou mudar o papel vale na hora.
--  - Toda leitura de conta e toda alteração entram no audit_log (actor_type = 'staff') na mesma
--    transação. O painel nunca recebe medidas, observações, conversas, séries ou cargas.
--  - E-mail sai mascarado; o completo só por admin_reveal_email (auditado).
-- Comunicados: avaliados por pessoa em my_announcements() (sem gravar uma linha por destinatário).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Colaboradores
-- ---------------------------------------------------------------------
create table public.staff_members (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(btrim(display_name)) between 1 and 80),
  role          text not null check (role in ('viewer', 'support', 'admin')),
  invited_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  disabled_at   timestamptz,
  last_seen_at  timestamptz
);

alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;

create or replace function public.staff_role_rank(p_role text)
returns smallint
language sql immutable
set search_path = ''
as $$
  select case p_role when 'viewer' then 1 when 'support' then 2 when 'admin' then 3 else 0 end::smallint;
$$;

-- ---------------------------------------------------------------------
-- 2. Auditoria: ações da equipe
-- ---------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_actor_type_check;
alter table public.audit_log add constraint audit_log_actor_type_check
  check (actor_type in ('user', 'service', 'system', 'staff'));

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
    'announcement_published', 'announcement_ended', 'announcements_purged'));

-- Mesma cadeia de hash; o tipo de autor vem do contexto da transação: as funções do painel
-- marcam guf.actor_type = 'staff' (require_staff), então até grant_plan/revoke_plan_grant
-- chamadas por elas ficam registradas como ação da equipe.
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
    case when v_actor is not null and coalesce(current_setting('guf.actor_type', true), '') = 'staff' then 'staff'
         when v_actor is not null then 'user'
         when p_action in ('consent_proofs_purged', 'audit_log_purged', 'announcements_purged') then 'system'
         else 'service' end,
    v_actor, p_subject_id, p_action, v_details, v_payload, v_prev,
    public.audit_log_hash(v_prev, v_at, p_action, v_actor, p_subject_id, v_payload)
  );
end;
$$;

-- Porta de entrada de toda função do painel: colaborador ativo, segundo fator e papel mínimo.
-- GA001 = não é colaborador (ou desativado) · GA002 = sem segundo fator · GA003 = papel insuficiente.
create or replace function public.require_staff(p_min_role text)
returns public.staff_members
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_staff public.staff_members;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  select * into v_staff from public.staff_members s where s.user_id = v_uid and s.disabled_at is null;
  if not found then
    raise exception 'Sem acesso ao painel' using errcode = 'GA001';
  end if;
  if coalesce((select auth.jwt()) ->> 'aal', '') <> 'aal2' then
    raise exception 'Confirme o segundo fator' using errcode = 'GA002';
  end if;
  if public.staff_role_rank(v_staff.role) < public.staff_role_rank(p_min_role) then
    raise exception 'Papel sem permissão para esta ação' using errcode = 'GA003';
  end if;

  perform set_config('guf.actor_type', 'staff', true);
  if v_staff.last_seen_at is null or v_staff.last_seen_at < now() - interval '5 minutes' then
    update public.staff_members s set last_seen_at = now() where s.user_id = v_uid;
  end if;
  return v_staff;
end;
$$;

-- Motivo das alterações (pedido do titular · violação dos Termos · cortesia/teste · outro).
-- A observação é curta e escrita pela equipe; a tela orienta a não colocar dados pessoais.
create or replace function public.staff_audit(
  p_action text, p_subject_id uuid, p_reason text, p_note text, p_details jsonb default '{}'
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if p_reason is not null and p_reason not in ('titular_request', 'terms_violation', 'courtesy', 'other') then
    raise exception 'Motivo inválido' using errcode = 'GA011';
  end if;
  if p_reason = 'other' and char_length(coalesce(v_note, '')) < 3 then
    raise exception 'Descreva o motivo' using errcode = 'GA011';
  end if;
  if char_length(coalesce(v_note, '')) > 200 then
    raise exception 'Motivo muito longo' using errcode = 'GA011';
  end if;
  perform public.audit_log_append(p_action, p_subject_id,
    coalesce(p_details, '{}') || jsonb_strip_nulls(jsonb_build_object('reason', p_reason, 'note', v_note)));
end;
$$;

create or replace function public.mask_email(p_email text)
returns text
language sql immutable
set search_path = ''
as $$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    else left(split_part(p_email, '@', 1), 2) || '•••@' || split_part(p_email, '@', 2)
  end;
$$;

create or replace function public.has_health_consent_of(p_user_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select c.action = 'granted'
      from public.consent_records c
     where c.user_id = p_user_id
       and c.document_id = (public.current_legal_document('health_consent')).id
     order by c.created_at desc
     limit 1
  ), false);
$$;

-- ---------------------------------------------------------------------
-- 3. Quem está no painel (não exige o segundo fator: a tela precisa saber se pede o código)
-- ---------------------------------------------------------------------
create or replace function public.admin_me()
returns table (user_id uuid, display_name text, email text, role text, aal text, has_verified_factor boolean)
language sql stable security definer
set search_path = ''
as $$
  select s.user_id, s.display_name, u.email::text, s.role,
         coalesce((select auth.jwt()) ->> 'aal', 'aal1'),
         exists (select 1 from auth.mfa_factors f where f.user_id = s.user_id and f.status = 'verified')
    from public.staff_members s
    join auth.users u on u.id = s.user_id
   where s.user_id = (select auth.uid()) and s.disabled_at is null;
$$;

-- ---------------------------------------------------------------------
-- 4. Contas
-- ---------------------------------------------------------------------
create or replace function public.admin_search_users(p_query text, p_limit integer default 25)
returns table (
  user_id uuid, name text, handle text, masked_email text, plan_code text, plan_name text,
  plan_is_default boolean, created_at timestamptz, visibility text
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
         u.created_at, coalesce(sp.visibility, 'private')
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.social_profiles sp on sp.user_id = u.id
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

-- Resumo da conta (docs/admin-panel.md §1.3). Cada abertura fica na auditoria.
create or replace function public.admin_get_user(p_user_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff  public.staff_members := public.require_staff('viewer');
  v_user   auth.users;
  v_result jsonb;
begin
  select * into v_user from auth.users u where u.id = p_user_id and u.deleted_at is null;
  if not found then
    raise exception 'Conta não encontrada' using errcode = 'GA004';
  end if;

  select jsonb_build_object(
    'id', v_user.id,
    'name', p.name,
    'handle', sp.handle,
    'visibility', coalesce(sp.visibility, 'private'),
    'masked_email', public.mask_email(v_user.email::text),
    'created_at', v_user.created_at,
    'last_sign_in_at', v_user.last_sign_in_at,
    'has_password', coalesce(v_user.encrypted_password, '') <> '',
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
    'documents', coalesce((select jsonb_agg(jsonb_build_object('doc_type', d.doc_type, 'version', d.version, 'accepted_at', d.created_at) order by d.doc_type)
                   from (select distinct on (ld.doc_type) ld.doc_type, ld.version, c.created_at
                           from public.consent_records c
                           join public.legal_documents ld on ld.id = c.document_id
                          where c.user_id = v_user.id and c.action = 'granted'
                            and ld.doc_type in ('terms', 'privacy', 'age_declaration', 'subscription_terms')
                          order by ld.doc_type, c.created_at desc) d), '[]'),
    -- Só o sim/não (nunca as medidas) e só para quem atende a pessoa (papel suporte ou admin).
    'health_consent', case when public.staff_role_rank(v_staff.role) >= 2 then public.has_health_consent_of(v_user.id) end,
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

create or replace function public.admin_reveal_email(p_user_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  perform public.require_staff('support');
  select u.email into v_email from auth.users u where u.id = p_user_id and u.deleted_at is null;
  if not found then
    raise exception 'Conta não encontrada' using errcode = 'GA004';
  end if;
  perform public.staff_audit('staff_revealed_email', p_user_id, null, null);
  return v_email;
end;
$$;

-- Aviso no app quando a equipe muda algo da conta (transparência, Art. 6º, VI).
create or replace function public.notify_account_change(p_user_id uuid, p_title text, p_body text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.announcements (title, body, format, tone, audience, purpose, priority, frequency,
                                    starts_at, ends_at, status, is_account_notice, reach_estimate,
                                    created_by, published_by, published_at)
  values (p_title, p_body, 'modal', 'info', '{"rules":[{"type":"ids"}]}', 'service', 100, 'once',
          now(), now() + interval '30 days', 'published', true, 1,
          (select auth.uid()), (select auth.uid()), now())
  returning id into v_id;
  insert into public.announcement_targets (announcement_id, user_id) values (v_id, p_user_id);
end;
$$;

-- Validação ao vivo do novo @ no painel: available · taken · invalid · same.
create or replace function public.admin_check_handle(p_user_id uuid, p_handle text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_handle text := public.normalize_handle(p_handle);
  v_owner  uuid;
begin
  perform public.require_staff('support');
  if v_handle !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' then
    return 'invalid';
  end if;
  select sp.user_id into v_owner from public.social_profiles sp where sp.handle = v_handle;
  if v_owner is null then return 'available'; end if;
  if v_owner = p_user_id then return 'same'; end if;
  return 'taken';
end;
$$;

create or replace function public.admin_update_handle(p_user_id uuid, p_handle text, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_handle text := public.normalize_handle(p_handle);
  v_old    text;
begin
  perform public.require_staff('support');
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id and u.deleted_at is null) then
    raise exception 'Conta não encontrada' using errcode = 'GA004';
  end if;
  if v_handle !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' then
    raise exception 'Nome de usuário inválido' using errcode = 'GS008';
  end if;
  perform public.ensure_social_profile(p_user_id);
  select sp.handle into v_old from public.social_profiles sp where sp.user_id = p_user_id;
  if v_old = v_handle then
    raise exception 'Nada mudou' using errcode = 'GA012';
  end if;
  begin
    update public.social_profiles sp set handle = v_handle where sp.user_id = p_user_id;
  exception when unique_violation then
    raise exception 'Esse nome de usuário já está em uso' using errcode = 'GS002';
  end;
  -- Sem o valor antigo nem o novo na auditoria (minimização): só o campo alterado.
  perform public.staff_audit('staff_changed_handle', p_user_id, p_reason, p_note, '{"field":"handle"}');
  perform public.notify_account_change(p_user_id, 'Seu @ foi alterado',
    'A equipe do guf mudou seu nome de usuário para @' || v_handle || '. Dúvidas? Fale com o suporte.');
end;
$$;

create or replace function public.admin_update_name(p_user_id uuid, p_name text, p_reason text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  perform public.require_staff('support');
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if char_length(v_name) not between 1 and 100 then
    raise exception 'Nome inválido' using errcode = 'GA012';
  end if;
  update public.profiles p set name = v_name where p.id = p_user_id and p.name is distinct from v_name;
  if not found then
    if not exists (select 1 from public.profiles p where p.id = p_user_id) then
      raise exception 'Conta não encontrada' using errcode = 'GA004';
    end if;
    raise exception 'Nada mudou' using errcode = 'GA012';
  end if;
  perform public.staff_audit('staff_changed_name', p_user_id, p_reason, p_note, '{"field":"name"}');
  perform public.notify_account_change(p_user_id, 'Seu nome foi atualizado',
    'A equipe do guf atualizou o nome do seu perfil. Dúvidas? Fale com o suporte.');
end;
$$;

-- Plano manual (cortesia, teste, correção). Assinatura paga nunca é mexida à mão.
-- Plano padrão (Free) = revoga os direitos manuais ativos. GA005 = a pessoa tem assinatura paga ativa.
create or replace function public.admin_set_plan(
  p_user_id uuid, p_plan_code text, p_valid_until timestamptz, p_reason text, p_note text default null
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_plan  public.plans;
  v_grant record;
begin
  perform public.require_staff('admin');
  if p_reason is null then
    raise exception 'Escolha um motivo' using errcode = 'GA011';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user_id and u.deleted_at is null) then
    raise exception 'Conta não encontrada' using errcode = 'GA004';
  end if;
  select * into v_plan from public.plans pl where pl.code = p_plan_code;
  if not found then
    raise exception 'Plano inexistente' using errcode = 'GA012';
  end if;
  if p_valid_until is not null and p_valid_until <= now() then
    raise exception 'Validade no passado' using errcode = 'GA012';
  end if;
  if exists (select 1 from public.plan_grants g
              where g.user_id = p_user_id and g.source = 'subscription' and g.revoked_at is null
                and (g.valid_until is null or g.valid_until > now())) then
    raise exception 'Assinatura paga ativa' using errcode = 'GA005';
  end if;
  if public.plan_of(p_user_id) = p_plan_code and not v_plan.is_default
     and p_valid_until is not distinct from (select max(g.valid_until) from public.plan_grants g
                                              where g.user_id = p_user_id and g.plan_code = p_plan_code and g.revoked_at is null) then
    raise exception 'Nada mudou' using errcode = 'GA012';
  end if;

  for v_grant in
    select g.id from public.plan_grants g
     where g.user_id = p_user_id and g.source in ('manual', 'trial') and g.revoked_at is null
       and (g.valid_until is null or g.valid_until > now())
  loop
    perform public.revoke_plan_grant(v_grant.id);
  end loop;
  if not v_plan.is_default then
    perform public.grant_plan(p_user_id, p_plan_code, p_valid_until, 'manual');
  end if;
  perform public.staff_audit('staff_changed_plan', p_user_id, p_reason, p_note,
    jsonb_build_object('plan', p_plan_code, 'valid_until', p_valid_until));
end;
$$;

-- Desvincular login social: só a pedido do titular e nunca deixando a conta sem jeito de entrar.
-- GA006 = era o único jeito de entrar.
create or replace function public.admin_unlink_identity(p_user_id uuid, p_provider text, p_note text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_user      auth.users;
  v_remaining text[];
begin
  perform public.require_staff('support');
  if p_provider is null or p_provider = 'email' then
    raise exception 'Login inválido' using errcode = 'GA012';
  end if;
  select * into v_user from auth.users u where u.id = p_user_id and u.deleted_at is null;
  if not found or not exists (select 1 from auth.identities i where i.user_id = p_user_id and i.provider = p_provider) then
    raise exception 'Login não encontrado' using errcode = 'GA004';
  end if;
  select coalesce(array_agg(distinct i.provider), '{}') into v_remaining
    from auth.identities i
   where i.user_id = p_user_id and i.provider <> p_provider
     and (i.provider <> 'email' or coalesce(v_user.encrypted_password, '') <> '');
  if cardinality(v_remaining) = 0 then
    raise exception 'Único jeito de entrar' using errcode = 'GA006';
  end if;

  delete from auth.identities i where i.user_id = p_user_id and i.provider = p_provider;
  update auth.users u
     set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}')
           || jsonb_build_object(
                'providers', coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(u.raw_app_meta_data -> 'providers', '[]')) x where x <> p_provider), '[]'),
                'provider', case when u.raw_app_meta_data ->> 'provider' = p_provider then v_remaining[1] else u.raw_app_meta_data ->> 'provider' end)
   where u.id = p_user_id;

  perform public.staff_audit('staff_unlinked_identity', p_user_id, 'titular_request', p_note,
    jsonb_build_object('provider', p_provider));
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Equipe (só admin; convite pela Edge Function admin-invite-staff)
-- ---------------------------------------------------------------------
create or replace function public.admin_list_staff()
returns table (
  user_id uuid, display_name text, email text, role text, has_verified_factor boolean,
  status text, last_seen_at timestamptz, created_at timestamptz, is_me boolean
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff('admin');
  return query
  select s.user_id, s.display_name, u.email::text, s.role,
         exists (select 1 from auth.mfa_factors f where f.user_id = s.user_id and f.status = 'verified'),
         case when s.disabled_at is not null then 'disabled'
              when u.last_sign_in_at is null then 'invited'
              else 'active' end,
         s.last_seen_at, s.created_at, s.user_id = (select auth.uid())
    from public.staff_members s
    join auth.users u on u.id = s.user_id
   order by s.disabled_at nulls first, s.display_name;
end;
$$;

-- Nunca a si mesmo e sempre sobra pelo menos um admin ativo (GA010).
create or replace function public.assert_staff_change_allowed(p_user_id uuid, p_losing_admin boolean)
returns public.staff_members
language plpgsql security definer
set search_path = ''
as $$
declare
  v_target public.staff_members;
begin
  if p_user_id = (select auth.uid()) then
    raise exception 'Não é possível mudar o próprio acesso' using errcode = 'GA010';
  end if;
  select * into v_target from public.staff_members s where s.user_id = p_user_id;
  if not found then
    raise exception 'Colaborador não encontrado' using errcode = 'GA004';
  end if;
  if p_losing_admin and v_target.role = 'admin' and v_target.disabled_at is null
     and (select count(*) from public.staff_members s where s.role = 'admin' and s.disabled_at is null) <= 1 then
    raise exception 'Precisa sobrar um admin' using errcode = 'GA010';
  end if;
  return v_target;
end;
$$;

create or replace function public.admin_set_staff_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_staff('admin');
  if p_role not in ('viewer', 'support', 'admin') then
    raise exception 'Papel inválido' using errcode = 'GA012';
  end if;
  perform public.assert_staff_change_allowed(p_user_id, p_role <> 'admin');
  update public.staff_members s set role = p_role where s.user_id = p_user_id and s.role <> p_role;
  if not found then
    raise exception 'Nada mudou' using errcode = 'GA012';
  end if;
  perform public.staff_audit('staff_member_role_changed', p_user_id, null, null, jsonb_build_object('role', p_role));
end;
$$;

create or replace function public.admin_set_staff_disabled(p_user_id uuid, p_disabled boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_staff('admin');
  perform public.assert_staff_change_allowed(p_user_id, p_disabled);
  update public.staff_members s
     set disabled_at = case when p_disabled then now() end
   where s.user_id = p_user_id and (s.disabled_at is null) = p_disabled;
  if not found then
    raise exception 'Nada mudou' using errcode = 'GA012';
  end if;
  perform public.staff_audit(case when p_disabled then 'staff_member_disabled' else 'staff_member_enabled' end, p_user_id, null, null);
end;
$$;

-- Confere o papel de quem chama (Edge Function admin-invite-staff, com o token do colaborador).
create or replace function public.admin_assert_role(p_role text)
returns void
language plpgsql security definer
set search_path = ''
as $fn$
begin
  perform public.require_staff(p_role);
end;
$fn$;

-- Só o servidor (Edge Function de convite e o primeiro admin, pelo SQL do painel do Supabase).
create or replace function public.register_staff_member(p_user_id uuid, p_display_name text, p_role text, p_invited_by uuid default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_role not in ('viewer', 'support', 'admin') then
    raise exception 'Papel inválido' using errcode = 'GA012';
  end if;
  if exists (select 1 from public.staff_members s where s.user_id = p_user_id) then
    raise exception 'Já faz parte da equipe' using errcode = 'GA013';
  end if;
  insert into public.staff_members (user_id, display_name, role, invited_by)
  values (p_user_id, btrim(p_display_name), p_role, p_invited_by);
  perform public.audit_log_append('staff_member_added', p_user_id,
    jsonb_strip_nulls(jsonb_build_object('role', p_role, 'invited_by', p_invited_by)));
end;
$$;

-- Auditoria da equipe (só admin). Filtros opcionais; paginação por id decrescente.
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
   where (a.actor_type = 'staff' or a.action like 'staff\_member\_%' or a.action like 'announcement%')
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
-- 6. Comunicados
-- ---------------------------------------------------------------------
create table public.announcements (
  id                uuid primary key default gen_random_uuid(),
  title             text not null default '' check (char_length(title) <= 60),
  body              text not null default '' check (char_length(body) <= 160),
  format            text not null default 'modal' check (format in ('fullscreen', 'modal', 'toast', 'banner')),
  tone              text not null default 'news' check (tone in ('info', 'success', 'warning', 'news')),
  cta_label         text check (cta_label is null or char_length(cta_label) between 1 and 24),
  cta_path          text check (cta_path is null or cta_path ~ '^/[A-Za-z0-9/_?=&#.-]{0,120}$'),
  audience          jsonb not null default '{"rules":[{"type":"all"}]}',
  purpose           text not null default 'service' check (purpose in ('service', 'legal', 'product')),
  priority          smallint not null default 50 check (priority in (0, 50, 100)),
  frequency         text not null default 'until_dismissed' check (frequency in ('once', 'until_dismissed')),
  starts_at         timestamptz,
  ends_at           timestamptz,
  status            text not null default 'draft' check (status in ('draft', 'published', 'ended')),
  -- Aviso automático de mudança feita pela equipe na conta (fica fora da lista do painel).
  is_account_notice boolean not null default false,
  reach_estimate    integer,
  created_by        uuid references auth.users (id) on delete set null,
  published_by      uuid references auth.users (id) on delete set null,
  published_at      timestamptz,
  ended_by          uuid references auth.users (id) on delete set null,
  ended_at          timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check ((cta_label is null) = (cta_path is null)),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index announcements_live_idx on public.announcements (status, starts_at, ends_at);

create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

create table public.announcement_targets (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  primary key (announcement_id, user_id)
);

create index announcement_targets_user_idx on public.announcement_targets (user_id);

create table public.announcement_receipts (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  seen_at         timestamptz,
  dismissed_at    timestamptz,
  cta_at          timestamptz,
  primary key (announcement_id, user_id)
);

create index announcement_receipts_user_idx on public.announcement_receipts (user_id);

alter table public.announcements enable row level security;
alter table public.announcement_targets enable row level security;
alter table public.announcement_receipts enable row level security;
revoke all on public.announcements, public.announcement_targets, public.announcement_receipts from anon, authenticated;

-- Público: { "rules": [ … ] }, todas precisam bater. Um validador e um avaliador por tipo de regra
-- (mesmo catálogo de packages/core/src/announcements.ts: AUDIENCE_CRITERIA).
create or replace function public.audience_rule_valid(p_rule jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select case p_rule ->> 'type'
    when 'all' then true
    when 'ids' then true
    when 'plans' then jsonb_typeof(p_rule -> 'plans') = 'array'
                      and jsonb_array_length(p_rule -> 'plans') between 1 and 10
    when 'created' then p_rule ->> 'op' in ('before', 'on', 'after')
                        and coalesce(p_rule ->> 'date', '') ~ '^\d{4}-\d{2}-\d{2}$'
    when 'visibility' then p_rule ->> 'value' in ('private', 'open')
    when 'health_consent' then true
    else false
  end;
$$;

create or replace function public.audience_valid(p_audience jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select jsonb_typeof(p_audience -> 'rules') = 'array'
     and jsonb_array_length(p_audience -> 'rules') between 1 and 6
     and (select bool_and(public.audience_rule_valid(r)) from jsonb_array_elements(p_audience -> 'rules') r)
     and (select count(distinct r ->> 'type') = count(*) from jsonb_array_elements(p_audience -> 'rules') r)
     and (not exists (select 1 from jsonb_array_elements(p_audience -> 'rules') r where r ->> 'type' = 'all')
          or jsonb_array_length(p_audience -> 'rules') = 1);
$$;

create or replace function public.audience_has_rule(p_audience jsonb, p_type text)
returns boolean
language sql immutable
set search_path = ''
as $$
  select exists (select 1 from jsonb_array_elements(coalesce(p_audience -> 'rules', '[]')) r where r ->> 'type' = p_type);
$$;

create or replace function public.audience_match_plans(p_rule jsonb, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select public.plan_of(p_user_id) in (select jsonb_array_elements_text(p_rule -> 'plans')); $$;

-- Data de criação comparada no fuso de São Paulo (o painel mostra o fuso).
create or replace function public.audience_match_created(p_rule jsonb, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select case p_rule ->> 'op'
    when 'before' then d < (p_rule ->> 'date')::date
    when 'on' then d = (p_rule ->> 'date')::date
    else d > (p_rule ->> 'date')::date end
    from (select (u.created_at at time zone 'America/Sao_Paulo')::date as d from auth.users u where u.id = p_user_id) x;
$$;

create or replace function public.audience_match_visibility(p_rule jsonb, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((select sp.visibility from public.social_profiles sp where sp.user_id = p_user_id), 'private') = p_rule ->> 'value';
$$;

-- p_in_targets: a pessoa está na lista de ids (tabela no app; lista do editor no alcance).
create or replace function public.audience_matches(p_audience jsonb, p_user_id uuid, p_in_targets boolean)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(bool_and(case r ->> 'type'
           when 'all' then true
           when 'ids' then p_in_targets
           when 'plans' then public.audience_match_plans(r, p_user_id)
           when 'created' then public.audience_match_created(r, p_user_id)
           when 'visibility' then public.audience_match_visibility(r, p_user_id)
           when 'health_consent' then public.has_health_consent_of(p_user_id)
           else false end), false)
    from jsonb_array_elements(p_audience -> 'rules') r;
$$;

-- Consentimento de saúde dado para acompanhar a própria evolução: público por ele só em
-- comunicado legal ou de serviço, nunca de produto (Art. 6º, I; docs/admin-panel.md §2.1). GA009.
create or replace function public.assert_announcement_valid(p_ann public.announcements)
returns void
language plpgsql immutable
set search_path = ''
as $$
begin
  if not public.audience_valid(p_ann.audience) then
    raise exception 'Público inválido' using errcode = 'GA008';
  end if;
  if public.audience_has_rule(p_ann.audience, 'health_consent') and p_ann.purpose = 'product' then
    raise exception 'Consentimento de saúde não pode ser usado em comunicado de produto' using errcode = 'GA009';
  end if;
end;
$$;

create or replace function public.admin_audience_count(p_audience jsonb, p_target_ids uuid[] default '{}')
returns integer
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.require_staff('viewer');
  if not public.audience_valid(p_audience) then
    raise exception 'Público inválido' using errcode = 'GA008';
  end if;
  return (select count(*)::integer from auth.users u
           where u.deleted_at is null
             and public.audience_matches(p_audience, u.id, u.id = any(coalesce(p_target_ids, '{}'))));
end;
$$;

create or replace function public.announcement_state(p_ann public.announcements)
returns text
language sql stable
set search_path = ''
as $$
  select case
    when p_ann.status = 'draft' then 'draft'
    when p_ann.status = 'ended' or (p_ann.ends_at is not null and p_ann.ends_at <= now()) then 'ended'
    when p_ann.starts_at > now() then 'scheduled'
    else 'active' end;
$$;

create or replace function public.admin_list_announcements()
returns table (
  id uuid, title text, tone text, format text, audience jsonb, purpose text, state text,
  starts_at timestamptz, ends_at timestamptz, reach_estimate integer, seen_count integer,
  dismissed_count integer, cta_count integer, targets_count integer, updated_at timestamptz
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  perform public.require_staff('viewer');
  return query
  select a.id, a.title, a.tone, a.format, a.audience, a.purpose, public.announcement_state(a),
         a.starts_at, a.ends_at, a.reach_estimate,
         (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.seen_at is not null)::integer,
         (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.dismissed_at is not null)::integer,
         (select count(*) from public.announcement_receipts r where r.announcement_id = a.id and r.cta_at is not null)::integer,
         (select count(*) from public.announcement_targets t where t.announcement_id = a.id)::integer,
         a.updated_at
    from public.announcements a
   where not a.is_account_notice
   order by coalesce(a.starts_at, a.updated_at) desc
   limit 300;
end;
$$;

create or replace function public.admin_get_announcement(p_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ann public.announcements;
begin
  perform public.require_staff('viewer');
  select * into v_ann from public.announcements a where a.id = p_id and not a.is_account_notice;
  if not found then
    raise exception 'Comunicado não encontrado' using errcode = 'GA007';
  end if;
  return to_jsonb(v_ann) - 'created_by' - 'published_by' - 'ended_by' || jsonb_build_object(
    'state', public.announcement_state(v_ann),
    'target_ids', coalesce((select jsonb_agg(t.user_id) from (select t0.user_id from public.announcement_targets t0
                              where t0.announcement_id = v_ann.id limit 10000) t), '[]'),
    'seen_count', (select count(*) from public.announcement_receipts r where r.announcement_id = v_ann.id and r.seen_at is not null),
    'dismissed_count', (select count(*) from public.announcement_receipts r where r.announcement_id = v_ann.id and r.dismissed_at is not null),
    'cta_count', (select count(*) from public.announcement_receipts r where r.announcement_id = v_ann.id and r.cta_at is not null),
    'published_by_name', (select s.display_name from public.staff_members s where s.user_id = v_ann.published_by)
  );
end;
$$;

-- Cria (p_id nulo) ou atualiza um rascunho. Publicado não se edita (GA007): encerre e duplique.
create or replace function public.admin_save_announcement(p_id uuid, p_draft jsonb, p_target_ids uuid[] default '{}')
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('support');
  v_ann   public.announcements;
  v_found integer := 0;
  v_ids   uuid[] := coalesce(p_target_ids, '{}');
begin
  if cardinality(v_ids) > 10000 then
    raise exception 'Lista de ids muito grande' using errcode = 'GA008';
  end if;
  if p_id is not null then
    select * into v_ann from public.announcements a where a.id = p_id and not a.is_account_notice for update;
    if not found then
      raise exception 'Comunicado não encontrado' using errcode = 'GA007';
    end if;
    if v_ann.status <> 'draft' then
      raise exception 'Só rascunhos podem ser editados' using errcode = 'GA007';
    end if;
  end if;

  v_ann.title     := btrim(coalesce(p_draft ->> 'title', ''));
  v_ann.body      := btrim(coalesce(p_draft ->> 'body', ''));
  v_ann.format    := coalesce(p_draft ->> 'format', 'modal');
  v_ann.tone      := coalesce(p_draft ->> 'tone', 'news');
  v_ann.cta_label := nullif(btrim(coalesce(p_draft ->> 'cta_label', '')), '');
  v_ann.cta_path  := case when v_ann.cta_label is null then null else p_draft ->> 'cta_path' end;
  v_ann.audience  := coalesce(p_draft -> 'audience', '{"rules":[{"type":"all"}]}');
  v_ann.purpose   := coalesce(p_draft ->> 'purpose', 'service');
  v_ann.priority  := coalesce((p_draft ->> 'priority')::smallint, 50);
  v_ann.frequency := coalesce(p_draft ->> 'frequency', 'until_dismissed');
  v_ann.starts_at := (p_draft ->> 'starts_at')::timestamptz;
  v_ann.ends_at   := (p_draft ->> 'ends_at')::timestamptz;
  perform public.assert_announcement_valid(v_ann);

  if p_id is null then
    insert into public.announcements (title, body, format, tone, cta_label, cta_path, audience, purpose,
                                      priority, frequency, starts_at, ends_at, created_by)
    values (v_ann.title, v_ann.body, v_ann.format, v_ann.tone, v_ann.cta_label, v_ann.cta_path, v_ann.audience,
            v_ann.purpose, v_ann.priority, v_ann.frequency, v_ann.starts_at, v_ann.ends_at, v_staff.user_id)
    returning * into v_ann;
  else
    update public.announcements a
       set title = v_ann.title, body = v_ann.body, format = v_ann.format, tone = v_ann.tone,
           cta_label = v_ann.cta_label, cta_path = v_ann.cta_path, audience = v_ann.audience,
           purpose = v_ann.purpose, priority = v_ann.priority, frequency = v_ann.frequency,
           starts_at = v_ann.starts_at, ends_at = v_ann.ends_at
     where a.id = p_id;
  end if;

  delete from public.announcement_targets t where t.announcement_id = v_ann.id;
  if public.audience_has_rule(v_ann.audience, 'ids') then
    insert into public.announcement_targets (announcement_id, user_id)
    select v_ann.id, u.id from auth.users u where u.id = any(v_ids) and u.deleted_at is null;
    get diagnostics v_found = row_count;
  end if;

  return jsonb_build_object('id', v_ann.id, 'targets_found', v_found,
    'targets_ignored', case when public.audience_has_rule(v_ann.audience, 'ids')
                            then (select count(distinct x) from unnest(v_ids) x) - v_found else 0 end);
end;
$$;

create or replace function public.admin_publish_announcement(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('admin');
  v_ann   public.announcements;
  v_reach integer;
begin
  select * into v_ann from public.announcements a where a.id = p_id and not a.is_account_notice for update;
  if not found or v_ann.status <> 'draft' then
    raise exception 'Comunicado não encontrado' using errcode = 'GA007';
  end if;
  perform public.assert_announcement_valid(v_ann);
  if v_ann.title = '' or v_ann.body = '' then
    raise exception 'Título e texto são obrigatórios' using errcode = 'GA008';
  end if;
  v_ann.starts_at := coalesce(v_ann.starts_at, now());
  if v_ann.ends_at is null or v_ann.ends_at <= greatest(v_ann.starts_at, now()) then
    raise exception 'Fim precisa ser depois do início e no futuro' using errcode = 'GA008';
  end if;
  if public.audience_has_rule(v_ann.audience, 'plans')
     and exists (select 1 from jsonb_array_elements(v_ann.audience -> 'rules') r, jsonb_array_elements_text(r -> 'plans') pc
                  where r ->> 'type' = 'plans' and not exists (select 1 from public.plans pl where pl.code = pc)) then
    raise exception 'Plano inexistente no público' using errcode = 'GA008';
  end if;
  if public.audience_has_rule(v_ann.audience, 'ids')
     and not exists (select 1 from public.announcement_targets t where t.announcement_id = p_id) then
    raise exception 'Lista de ids vazia' using errcode = 'GA008';
  end if;

  select count(*)::integer into v_reach from auth.users u
   where u.deleted_at is null
     and public.audience_matches(v_ann.audience, u.id,
           exists (select 1 from public.announcement_targets t where t.announcement_id = p_id and t.user_id = u.id));

  update public.announcements a
     set status = 'published', starts_at = v_ann.starts_at, reach_estimate = v_reach,
         published_by = v_staff.user_id, published_at = now()
   where a.id = p_id;
  perform public.audit_log_append('announcement_published', null,
    jsonb_build_object('announcement_id', p_id, 'format', v_ann.format, 'purpose', v_ann.purpose, 'reach', v_reach));
end;
$$;

-- Encerrar apaga a lista de ids (retenção, docs/admin-panel.md §2.1); os números ficam.
create or replace function public.admin_end_announcement(p_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('admin');
begin
  update public.announcements a
     set status = 'ended', ended_at = now(), ended_by = v_staff.user_id
   where a.id = p_id and a.status = 'published' and not a.is_account_notice;
  if not found then
    raise exception 'Comunicado não encontrado' using errcode = 'GA007';
  end if;
  delete from public.announcement_targets t where t.announcement_id = p_id;
  perform public.audit_log_append('announcement_ended', null, jsonb_build_object('announcement_id', p_id));
end;
$$;

create or replace function public.admin_duplicate_announcement(p_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members := public.require_staff('support');
  v_new   uuid;
begin
  insert into public.announcements (title, body, format, tone, cta_label, cta_path, audience, purpose, priority, frequency, created_by)
  select a.title, a.body, a.format, a.tone, a.cta_label, a.cta_path, a.audience, a.purpose, a.priority, a.frequency, v_staff.user_id
    from public.announcements a where a.id = p_id and not a.is_account_notice
  returning id into v_new;
  if v_new is null then
    raise exception 'Comunicado não encontrado' using errcode = 'GA007';
  end if;
  insert into public.announcement_targets (announcement_id, user_id)
  select v_new, t.user_id from public.announcement_targets t where t.announcement_id = p_id;
  return v_new;
end;
$$;

-- App: comunicados que valem para quem pergunta agora (nunca a regra nem outras pessoas).
create or replace function public.my_announcements()
returns table (
  id uuid, format text, tone text, title text, body text, cta_label text, cta_path text,
  priority smallint, frequency text, published_at timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  return query
  select a.id, a.format, a.tone, a.title, a.body, a.cta_label, a.cta_path, a.priority, a.frequency, a.published_at
    from public.announcements a
    left join public.announcement_receipts r on r.announcement_id = a.id and r.user_id = v_uid
   where a.status = 'published'
     and a.starts_at <= now()
     and (a.ends_at is null or a.ends_at > now())
     and case a.frequency when 'once' then r.seen_at is null
                          else r.dismissed_at is null and r.cta_at is null end
     and public.audience_matches(a.audience, v_uid,
           exists (select 1 from public.announcement_targets t where t.announcement_id = a.id and t.user_id = v_uid))
   order by a.priority desc, a.published_at desc
   limit 10;
end;
$$;

create or replace function public.mark_announcement(p_id uuid, p_event text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_event not in ('seen', 'dismissed', 'cta') then
    raise exception 'Evento inválido' using errcode = '22023';
  end if;
  if not exists (select 1 from public.my_announcements() m where m.id = p_id)
     and not exists (select 1 from public.announcement_receipts r where r.announcement_id = p_id and r.user_id = v_uid) then
    return;
  end if;
  insert into public.announcement_receipts (announcement_id, user_id, seen_at, dismissed_at, cta_at)
  values (p_id, v_uid, now(),
          case when p_event = 'dismissed' then now() end,
          case when p_event = 'cta' then now() end)
  on conflict (announcement_id, user_id) do update
    set seen_at = coalesce(public.announcement_receipts.seen_at, excluded.seen_at),
        dismissed_at = coalesce(public.announcement_receipts.dismissed_at, excluded.dismissed_at),
        cta_at = coalesce(public.announcement_receipts.cta_at, excluded.cta_at);
end;
$$;

-- Retenção (.lgpd/retention.md): lista de ids sai quando o comunicado termina; o comunicado e
-- quem viu/fechou/tocou saem 12 meses depois do fim.
create or replace function public.purge_expired_announcements()
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.announcement_targets t
   using public.announcements a
   where a.id = t.announcement_id and a.status <> 'draft'
     and (a.status = 'ended' or a.ends_at <= now());
  delete from public.announcements a
   where a.status <> 'draft' and coalesce(a.ended_at, a.ends_at) < now() - interval '12 months';
  get diagnostics v_count = row_count;
  if v_count > 0 then
    perform public.audit_log_append('announcements_purged', null, jsonb_build_object('count', v_count));
  end if;
end;
$$;

select cron.schedule(
  'purge-expired-announcements',
  '41 3 * * *',                                     -- todo dia, 03:41 UTC
  $$select public.purge_expired_announcements()$$
);

-- ---------------------------------------------------------------------
-- 7. Permissões das funções
-- ---------------------------------------------------------------------
revoke execute on function
  public.staff_role_rank(text),
  public.require_staff(text),
  public.staff_audit(text, uuid, text, text, jsonb),
  public.has_health_consent_of(uuid),
  public.notify_account_change(uuid, text, text),
  public.assert_staff_change_allowed(uuid, boolean),
  public.register_staff_member(uuid, text, text, uuid),
  public.audience_match_plans(jsonb, uuid),
  public.audience_match_created(jsonb, uuid),
  public.audience_match_visibility(jsonb, uuid),
  public.audience_matches(jsonb, uuid, boolean),
  public.assert_announcement_valid(public.announcements),
  public.announcement_state(public.announcements),
  public.purge_expired_announcements()
  from public, anon, authenticated;

revoke execute on function
  public.admin_assert_role(text),
  public.admin_me(),
  public.admin_search_users(text, integer),
  public.admin_get_user(uuid),
  public.admin_reveal_email(uuid),
  public.admin_check_handle(uuid, text),
  public.admin_update_handle(uuid, text, text, text),
  public.admin_update_name(uuid, text, text, text),
  public.admin_set_plan(uuid, text, timestamptz, text, text),
  public.admin_unlink_identity(uuid, text, text),
  public.admin_list_staff(),
  public.admin_set_staff_role(uuid, text),
  public.admin_set_staff_disabled(uuid, boolean),
  public.admin_list_audit(uuid, text, timestamptz, text, bigint, integer),
  public.admin_audience_count(jsonb, uuid[]),
  public.admin_list_announcements(),
  public.admin_get_announcement(uuid),
  public.admin_save_announcement(uuid, jsonb, uuid[]),
  public.admin_publish_announcement(uuid),
  public.admin_end_announcement(uuid),
  public.admin_duplicate_announcement(uuid),
  public.my_announcements(),
  public.mark_announcement(uuid, text)
  from public, anon;

grant execute on function
  public.admin_assert_role(text),
  public.admin_me(),
  public.admin_search_users(text, integer),
  public.admin_get_user(uuid),
  public.admin_reveal_email(uuid),
  public.admin_check_handle(uuid, text),
  public.admin_update_handle(uuid, text, text, text),
  public.admin_update_name(uuid, text, text, text),
  public.admin_set_plan(uuid, text, timestamptz, text, text),
  public.admin_unlink_identity(uuid, text, text),
  public.admin_list_staff(),
  public.admin_set_staff_role(uuid, text),
  public.admin_set_staff_disabled(uuid, boolean),
  public.admin_list_audit(uuid, text, timestamptz, text, bigint, integer),
  public.admin_audience_count(jsonb, uuid[]),
  public.admin_list_announcements(),
  public.admin_get_announcement(uuid),
  public.admin_save_announcement(uuid, jsonb, uuid[]),
  public.admin_publish_announcement(uuid),
  public.admin_end_announcement(uuid),
  public.admin_duplicate_announcement(uuid),
  public.my_announcements(),
  public.mark_announcement(uuid, text)
  to authenticated;

grant execute on function public.register_staff_member(uuid, text, text, uuid) to service_role;
