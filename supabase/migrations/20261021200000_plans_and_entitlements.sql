-- =====================================================================
-- GUF APP · Planos, funcionalidades, assinaturas e direitos de acesso
--
-- Três ideias separadas (detalhes em docs/plans-and-access.md):
--   1. Catálogo: plans → plan_features → features. O código pergunta "pode usar X?" ou "qual o limite
--      de Y?", nunca "é Pro?". Mudar o que um plano oferece = nova linha por migration, sem deploy.
--   2. subscriptions: espelho do gateway de pagamento (só o webhook grava; o pagamento ainda não existe).
--   3. plan_grants: direitos com ORIGEM (assinatura, manual, teste). O plano efetivo é o de maior rank
--      entre os direitos válidos; sem nenhum, o plano padrão (Free). Origens futuras (ex.: vaga de
--      aluno dada por um personal) entram como novo valor de `source`, sem mudar o resto.
--
-- Limites de ESCRITA são aplicados aqui no banco (gatilhos em projects e routines; GUF AI na Edge
-- Function). Limites de LEITURA do próprio histórico e da competição ficam no app (ver o documento).
-- Substitui a tabela `entitlements` (uma linha por usuário, sem origem), que é migrada e removida.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Catálogo (leitura pública; escrita só por migration)
-- ---------------------------------------------------------------------
create table public.plans (
  code           text primary key check (code ~ '^[a-z][a-z_]{1,29}$'),
  name           text not null check (char_length(name) between 1 and 40),
  rank           smallint not null unique,
  is_default     boolean not null default false,
  is_purchasable boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Exatamente um plano padrão: é o de quem não tem direito válido.
create unique index plans_single_default_idx on public.plans (is_default) where is_default;

create table public.features (
  code        text primary key check (code ~ '^[a-z][a-z_]{1,49}$'),
  kind        text not null check (kind in ('flag', 'limit')),
  description text not null
);

-- Sem linha = funcionalidade não liberada no plano. Em 'limit', limit_value nulo = sem limite.
create table public.plan_features (
  plan_code    text not null references public.plans (code) on update cascade on delete cascade,
  feature_code text not null references public.features (code) on update cascade on delete cascade,
  limit_value  integer check (limit_value >= 0),
  primary key (plan_code, feature_code)
);

alter table public.plans enable row level security;
alter table public.features enable row level security;
alter table public.plan_features enable row level security;

create policy plans_read on public.plans for select to anon, authenticated using (true);
create policy features_read on public.features for select to anon, authenticated using (true);
create policy plan_features_read on public.plan_features for select to anon, authenticated using (true);

insert into public.plans (code, name, rank, is_default, is_purchasable) values
  ('free', 'Free', 0, true, false),
  ('pro', 'Pro', 20, false, true);

insert into public.features (code, kind, description) values
  ('custom_projects', 'limit', 'Projetos ativos criados pela pessoa, além do Favoritos'),
  ('routines_per_project', 'limit', 'Rotinas ativas (não arquivadas) em cada projeto'),
  ('guf_ai_daily_messages', 'limit', 'Perguntas ao GUF AI em 24 horas'),
  ('history_months', 'limit', 'Meses de histórico visíveis, contando o atual (2 = o mês atual e o anterior)'),
  ('competition_full_history', 'flag', 'Competição em outros períodos além do mês atual');

insert into public.plan_features (plan_code, feature_code, limit_value) values
  ('free', 'custom_projects', 0),
  ('free', 'routines_per_project', 5),
  ('free', 'guf_ai_daily_messages', 3),
  ('free', 'history_months', 2),
  ('pro', 'custom_projects', null),
  ('pro', 'routines_per_project', null),
  ('pro', 'guf_ai_daily_messages', 40),
  ('pro', 'history_months', null),
  ('pro', 'competition_full_history', null);

-- ---------------------------------------------------------------------
-- 2. Assinaturas (espelho do gateway; só o servidor grava)
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  plan_code          text not null references public.plans (code) on update cascade,
  provider           text not null check (provider in ('stripe', 'mercadopago', 'apple', 'google', 'manual')),
  provider_ref       text not null check (char_length(provider_ref) between 1 and 200),
  status             text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  current_period_end timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (provider, provider_ref)
);

create index subscriptions_user_idx on public.subscriptions (user_id);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;
create policy subscriptions_read_own on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Direitos de acesso (com origem; só o servidor grava)
-- ---------------------------------------------------------------------
create table public.plan_grants (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  plan_code       text not null references public.plans (code) on update cascade,
  source          text not null check (source in ('subscription', 'manual', 'trial')),
  subscription_id uuid references public.subscriptions (id) on delete cascade,
  valid_from      timestamptz not null default now(),
  valid_until     timestamptz,
  revoked_at      timestamptz,
  created_at      timestamptz not null default now(),
  check ((source = 'subscription') = (subscription_id is not null)),
  check (valid_until is null or valid_until > valid_from)
);

create index plan_grants_user_idx on public.plan_grants (user_id);
-- Um direito por assinatura: o webhook atualiza o mesmo registro a cada evento.
create unique index plan_grants_subscription_idx on public.plan_grants (subscription_id) where subscription_id is not null;

alter table public.plan_grants enable row level security;
create policy plan_grants_read_own on public.plan_grants
  for select to authenticated using (user_id = (select auth.uid()));

-- Quem tinha 'premium' na tabela antiga vira um direito Pro manual (mesma validade).
insert into public.plan_grants (user_id, plan_code, source, valid_until)
select e.user_id, 'pro', 'manual', e.valid_until
  from public.entitlements e
 where e.plan = 'premium';

-- ---------------------------------------------------------------------
-- 4. Plano efetivo e funcionalidades
-- As versões "_of" recebem o usuário: servem aos gatilhos (que olham o dono da linha) e ao
-- servidor; ninguém do app consegue perguntar o plano de outra pessoa (execução revogada).
-- ---------------------------------------------------------------------
create or replace function public.plan_of(p_user_id uuid)
returns text
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    (select g.plan_code
       from public.plan_grants g
       join public.plans p on p.code = g.plan_code
      where g.user_id = p_user_id
        and g.revoked_at is null
        and g.valid_from <= now()
        and (g.valid_until is null or g.valid_until > now())
      order by p.rank desc
      limit 1),
    (select p.code from public.plans p where p.is_default)
  );
$$;

create or replace function public.has_feature_of(p_user_id uuid, p_feature text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.plan_features pf
     where pf.plan_code = public.plan_of(p_user_id) and pf.feature_code = p_feature
  );
$$;

-- Limite do plano: número, nulo = sem limite, 0 = não liberado.
create or replace function public.feature_limit_of(p_user_id uuid, p_feature text)
returns integer
language sql stable security definer
set search_path = ''
as $$
  select case
    when public.has_feature_of(p_user_id, p_feature) then
      (select pf.limit_value from public.plan_features pf
        where pf.plan_code = public.plan_of(p_user_id) and pf.feature_code = p_feature)
    else 0
  end;
$$;

revoke execute on function public.plan_of(uuid), public.has_feature_of(uuid, text), public.feature_limit_of(uuid, text)
  from public, anon, authenticated;

create or replace function public.effective_plan()
returns text
language sql stable
set search_path = ''
as $$
  select public.plan_of((select auth.uid()));
$$;

create or replace function public.has_feature(p_feature text)
returns boolean
language sql stable
set search_path = ''
as $$
  select public.has_feature_of((select auth.uid()), p_feature);
$$;

create or replace function public.feature_limit(p_feature text)
returns integer
language sql stable
set search_path = ''
as $$
  select public.feature_limit_of((select auth.uid()), p_feature);
$$;

-- Tudo o que o app precisa numa chamada: plano, validade e cada funcionalidade com
-- `enabled`, `limit` (nulo = sem limite) e `upgradable` (existe plano à venda que libera mais).
create or replace function public.my_entitlements()
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_plan public.plans;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select p.* into v_plan from public.plans p where p.code = public.plan_of(v_uid);

  return jsonb_build_object(
    'plan', jsonb_build_object('code', v_plan.code, 'name', v_plan.name, 'is_default', v_plan.is_default),
    'valid_until', (select max(g.valid_until)
                      from public.plan_grants g
                     where g.user_id = v_uid and g.plan_code = v_plan.code and g.revoked_at is null
                       and g.valid_from <= now() and (g.valid_until is null or g.valid_until > now())
                    having bool_and(g.valid_until is not null)),
    'features', (select coalesce(jsonb_object_agg(f.code, jsonb_build_object(
                   'kind', f.kind,
                   'enabled', mine.feature_code is not null and (f.kind = 'flag' or mine.limit_value is null or mine.limit_value > 0),
                   'limit', case when f.kind = 'limit' then coalesce(mine.limit_value, case when mine.feature_code is null then 0 end) end,
                   'upgradable', exists (
                     select 1 from public.plan_features other
                       join public.plans op on op.code = other.plan_code
                      where other.feature_code = f.code and op.is_purchasable and op.rank > v_plan.rank
                        and (mine.feature_code is null
                             or (f.kind = 'limit' and mine.limit_value is not null
                                 and (other.limit_value is null or other.limit_value > mine.limit_value)))
                   )
                 )), '{}')
                   from public.features f
                   left join public.plan_features mine on mine.feature_code = f.code and mine.plan_code = v_plan.code)
  );
end;
$$;

revoke execute on function public.effective_plan(), public.has_feature(text), public.feature_limit(text), public.my_entitlements()
  from public, anon;
grant execute on function public.effective_plan(), public.has_feature(text), public.feature_limit(text), public.my_entitlements()
  to authenticated;

-- Compatibilidade: "premium" = qualquer plano acima do padrão.
create or replace function public.is_premium()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select p.rank from public.plans p where p.code = public.plan_of((select auth.uid())))
       > (select p.rank from public.plans p where p.is_default);
$$;

-- ---------------------------------------------------------------------
-- 5. Limites de escrita aplicados no banco (erro GL001 = plan_limit; hint = funcionalidade)
-- Sem auth.uid() (servidor, jobs, cadastro) os limites não se aplicam.
-- Quem já passou do limite mantém o que tem: só não cria nem reativa mais.
-- ---------------------------------------------------------------------
create or replace function public.enforce_project_plan_limit()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if (select auth.uid()) is null or new.is_favorites or new.archived_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.archived_at is null then
    return new;
  end if;

  v_limit := public.feature_limit_of(new.user_id, 'custom_projects');
  if v_limit is not null and (
       select count(*) from public.projects p
        where p.user_id = new.user_id and not p.is_favorites and p.archived_at is null and p.id <> new.id
     ) >= v_limit then
    raise exception 'Limite de projetos do plano' using errcode = 'GL001', hint = 'custom_projects';
  end if;
  return new;
end;
$$;

create trigger projects_enforce_plan_limit
  before insert or update of archived_at on public.projects
  for each row execute function public.enforce_project_plan_limit();

create or replace function public.enforce_routine_plan_limit()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  if (select auth.uid()) is null or new.archived_at is not null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.archived_at is null and old.project_id = new.project_id then
    return new;
  end if;

  v_limit := public.feature_limit_of(new.user_id, 'routines_per_project');
  if v_limit is not null and (
       select count(*) from public.routines r
        where r.project_id = new.project_id and r.archived_at is null and r.id <> new.id
     ) >= v_limit then
    raise exception 'Limite de rotinas por projeto do plano' using errcode = 'GL001', hint = 'routines_per_project';
  end if;
  return new;
end;
$$;

create trigger routines_enforce_plan_limit
  before insert or update of project_id, archived_at on public.routines
  for each row execute function public.enforce_routine_plan_limit();

revoke execute on function public.enforce_project_plan_limit(), public.enforce_routine_plan_limit()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Gravação de direitos (só service_role: webhook de pagamento, suporte)
-- ---------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in (
    'consent_granted', 'consent_revoked', 'health_data_deleted', 'data_exported',
    'account_deleted', 'consent_proofs_purged', 'audit_log_purged',
    'social_data_deleted', 'social_visibility_changed', 'follow_accepted', 'follow_ended', 'user_blocked',
    'ai_conversations_purged', 'plan_granted', 'plan_revoked'));

-- Evento do gateway (criada, renovada, em atraso, cancelada, expirada): atualiza a assinatura e o
-- direito ligado a ela. Idempotente: o mesmo evento repetido deixa tudo igual.
create or replace function public.apply_subscription_event(
  p_user_id            uuid,
  p_plan_code          text,
  p_provider           text,
  p_provider_ref       text,
  p_status             text,
  p_current_period_end timestamptz
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_subscription_id uuid;
  v_is_active       boolean := p_status in ('trialing', 'active', 'past_due');
begin
  insert into public.subscriptions (user_id, plan_code, provider, provider_ref, status, current_period_end)
  values (p_user_id, p_plan_code, p_provider, p_provider_ref, p_status, p_current_period_end)
  on conflict (provider, provider_ref) do update
    set plan_code = excluded.plan_code,
        status = excluded.status,
        current_period_end = excluded.current_period_end
  returning id into v_subscription_id;

  insert into public.plan_grants (user_id, plan_code, source, subscription_id, valid_until, revoked_at)
  values (p_user_id, p_plan_code, 'subscription', v_subscription_id, p_current_period_end,
          case when v_is_active then null else now() end)
  on conflict (subscription_id) where subscription_id is not null do update
    set plan_code = excluded.plan_code,
        valid_until = excluded.valid_until,
        revoked_at = case when v_is_active then null else coalesce(public.plan_grants.revoked_at, now()) end;

  perform public.audit_log_append(
    case when v_is_active then 'plan_granted' else 'plan_revoked' end,
    p_user_id,
    jsonb_build_object('plan', p_plan_code, 'source', 'subscription', 'provider', p_provider, 'status', p_status)
  );
  return v_subscription_id;
end;
$$;

-- Direito sem pagamento (suporte, testadores do beta, período de teste).
create or replace function public.grant_plan(
  p_user_id     uuid,
  p_plan_code   text,
  p_valid_until timestamptz default null,
  p_source      text default 'manual'
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_grant_id uuid;
begin
  if p_source not in ('manual', 'trial') then
    raise exception 'Origem inválida para direito sem pagamento' using errcode = '22023';
  end if;

  insert into public.plan_grants (user_id, plan_code, source, valid_until)
  values (p_user_id, p_plan_code, p_source, p_valid_until)
  returning id into v_grant_id;

  perform public.audit_log_append('plan_granted', p_user_id,
    jsonb_build_object('plan', p_plan_code, 'source', p_source, 'valid_until', p_valid_until));
  return v_grant_id;
end;
$$;

create or replace function public.revoke_plan_grant(p_grant_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_grant public.plan_grants;
begin
  update public.plan_grants g set revoked_at = now()
   where g.id = p_grant_id and g.revoked_at is null
  returning g.* into v_grant;

  if v_grant.id is not null then
    perform public.audit_log_append('plan_revoked', v_grant.user_id,
      jsonb_build_object('plan', v_grant.plan_code, 'source', v_grant.source));
  end if;
end;
$$;

revoke execute on function
  public.apply_subscription_event(uuid, text, text, text, text, timestamptz),
  public.grant_plan(uuid, text, timestamptz, text),
  public.revoke_plan_grant(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Aceites agrupados por momento (cadastro e assinatura)
-- Cadastro: termos, privacidade e idade. Assinatura: Termos da Assinatura, junto com o que
-- estiver pendente do cadastro, numa única confirmação. Consentimento de saúde continua à parte
-- (específico e destacado, LGPD art. 11, I).
-- requires_reaccept passa a valer: versão publicada com false (correção de texto) não pede aceite de
-- novo a quem aceitou uma versão a partir da última que exigiu.
-- ---------------------------------------------------------------------
alter table public.legal_documents drop constraint legal_documents_doc_type_check;
alter table public.legal_documents add constraint legal_documents_doc_type_check
  check (doc_type in ('terms', 'privacy', 'health_consent', 'age_declaration', 'social_sharing', 'subscription_terms'));

create or replace function public.pending_documents_of(p_doc_types text[])
returns setof public.legal_documents
language sql stable
set search_path = ''
as $$
  select d.*
    from public.legal_documents d
   where d.id in (select (public.current_legal_document(t)).id from unnest(p_doc_types) as t)
     and not exists (
           select 1
             from public.consent_records c
             join public.legal_documents accepted on accepted.id = c.document_id
            where c.user_id = (select auth.uid())
              and c.action = 'granted'
              and accepted.doc_type = d.doc_type
              and accepted.published_at >= coalesce(
                    (select max(r.published_at) from public.legal_documents r
                      where r.doc_type = d.doc_type and r.requires_reaccept),
                    '-infinity'::timestamptz)
         );
$$;

revoke execute on function public.pending_documents_of(text[]) from public, anon, authenticated;

create or replace function public.pending_documents()
returns setof public.legal_documents
language sql stable security definer
set search_path = ''
as $$
  select * from public.pending_documents_of(array['terms', 'privacy', 'age_declaration']);
$$;

-- Tudo o que a pessoa precisa aceitar para assinar (Termos da Assinatura + pendentes do cadastro).
create or replace function public.pending_subscription_documents()
returns setof public.legal_documents
language sql stable security definer
set search_path = ''
as $$
  select * from public.pending_documents_of(array['terms', 'privacy', 'age_declaration', 'subscription_terms']);
$$;

revoke execute on function public.pending_subscription_documents() from public, anon;
grant execute on function public.pending_subscription_documents() to authenticated;

-- 'subscribe' = aceite na tela de assinatura (pode incluir os documentos do cadastro pendentes).
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
  v_doc_types text[];
  v_valid_count integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_source is null or p_source not in ('signup_email', 'signup_google', 'reaccept', 'subscribe') then
    raise exception 'Origem do aceite inválida' using errcode = '22023';
  end if;
  if p_platform is not null and p_platform not in ('web', 'ios', 'android') then
    raise exception 'Plataforma inválida' using errcode = '22023';
  end if;

  v_doc_types := case when p_source = 'subscribe'
                      then array['terms', 'privacy', 'age_declaration', 'subscription_terms']
                      else array['terms', 'privacy', 'age_declaration'] end;

  select coalesce(array_agg(distinct doc_id), '{}') into v_ids
    from unnest(p_document_ids) as doc_id;

  if cardinality(v_ids) = 0 then
    raise exception 'Nenhum documento informado' using errcode = '22023';
  end if;

  select count(*) into v_valid_count
    from unnest(v_ids) as doc_id
   where doc_id in (select (public.current_legal_document(t)).id from unnest(v_doc_types) as t);

  if v_valid_count <> cardinality(v_ids) then
    raise exception 'Documento inválido ou desatualizado' using errcode = '22023';
  end if;

  insert into public.consent_records (user_id, document_id, action, source, platform)
  select v_uid, doc_id, 'granted', p_source, p_platform
    from unnest(v_ids) as doc_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 8. Cadastro sem a tabela antiga (cópia de 20261010200116, sem o insert em entitlements):
-- o plano Free é o padrão de quem não tem direito, então não precisa de linha.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ids      jsonb := new.raw_user_meta_data -> 'accepted_document_ids';
  v_platform text  := new.raw_user_meta_data ->> 'signup_platform';
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'), 100),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );

  insert into public.projects (user_id, name, is_active, is_favorites, position)
  values (new.id, 'Favoritos', true, true, 0);

  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email'
     and jsonb_typeof(v_ids) = 'array' then

    if v_platform is not null and v_platform not in ('web', 'ios', 'android') then
      v_platform := null;
    end if;

    -- Compara como texto: um id malformado não gera erro de conversão (seria ignorado).
    insert into public.consent_records (user_id, document_id, action, source, platform)
    select new.id, d.id, 'granted', 'signup_email', v_platform
      from public.legal_documents d
     where d.id::text in (
             select lower(trim(e.value))
               from jsonb_array_elements_text(v_ids) as e(value)
           )
       and d.id in (
             select (public.current_legal_document(t)).id
               from unnest(array['terms', 'privacy', 'age_declaration']) as t
           );
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Exportar meus dados: formato guf-export/6 (plano atual, direitos e assinaturas)
-- Cópia de 20261021180000_guf_ai com o bloco 'plano' novo.
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
    'formato',                   'guf-export/6',
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
    'plano',                     jsonb_build_object(
                                   'plano_atual', public.plan_of(v_uid),
                                   'direitos',    (select coalesce(jsonb_agg(to_jsonb(g) order by g.valid_from), '[]')
                                                     from public.plan_grants g where g.user_id = v_uid),
                                   'assinaturas', (select coalesce(jsonb_agg(to_jsonb(s) order by s.created_at), '[]')
                                                     from public.subscriptions s where s.user_id = v_uid)
                                 ),
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
    'perfil_social',             (select to_jsonb(sp) from public.social_profiles sp where sp.user_id = v_uid),
    'seguidores_e_seguindo',     (select coalesce(jsonb_agg(jsonb_build_object(
                                     'tipo',            case when f.follower_id = v_uid then 'seguindo' else 'seguidor' end,
                                     'pessoa_id',       case when f.follower_id = v_uid then f.followee_id else f.follower_id end,
                                     'pessoa_usuario',  osp.handle,
                                     'status',          f.status,
                                     'pedido_em',       f.created_at,
                                     'aceito_em',       f.accepted_at
                                   ) order by f.created_at), '[]')
                                    from public.follows f
                                    left join public.social_profiles osp
                                      on osp.user_id = case when f.follower_id = v_uid then f.followee_id else f.follower_id end
                                   where f.follower_id = v_uid or f.followee_id = v_uid),
    'bloqueios',                 (select coalesce(jsonb_agg(jsonb_build_object(
                                     'pessoa_id',     b.blocked_id,
                                     'bloqueado_em',  b.created_at
                                   ) order by b.created_at), '[]')
                                    from public.blocks b where b.blocker_id = v_uid),
    'aparelhos_com_avisos',      (select coalesce(jsonb_agg(jsonb_build_object(
                                     'endereco_do_servico_de_push', ps.endpoint,
                                     'inscrito_em',                 ps.created_at,
                                     'ultimo_aviso_em',             ps.last_sent_at
                                   ) order by ps.created_at), '[]')
                                    from public.push_subscriptions ps where ps.user_id = v_uid),
    'avisos_da_competicao',      (select coalesce(jsonb_agg(jsonb_build_object(
                                     'competidor_id',  cas.rival_id,
                                     'temporada',      cas.season,
                                     'posicao',        cas.state,
                                     'atualizado_em',  cas.updated_at
                                   ) order by cas.season, cas.updated_at), '[]')
                                    from public.competition_alert_states cas where cas.watcher_id = v_uid),
    'conversas_guf_ai',          (select coalesce(jsonb_agg(jsonb_build_object(
                                     'id',             c.id,
                                     'titulo',         c.title,
                                     'criada_em',      c.created_at,
                                     'atualizada_em',  c.updated_at,
                                     'mensagens',      (select coalesce(jsonb_agg(jsonb_build_object(
                                                          'autor',            case m.role when 'user' then 'voce' else 'guf_ai' end,
                                                          'texto',            m.content,
                                                          'usou_historico',   m.used_history,
                                                          'avaliacao',        m.feedback,
                                                          'enviada_em',       m.created_at
                                                        ) order by m.created_at), '[]')
                                                         from public.ai_messages m where m.conversation_id = c.id)
                                   ) order by c.created_at), '[]')
                                    from public.ai_conversations c where c.user_id = v_uid),
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
    'format', 'guf-export/6',
    'workouts', jsonb_array_length(v_result -> 'treinos'),
    'measurements', jsonb_array_length(v_result -> 'medidas')
  ));

  return v_result;
end;
$$;

revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------
-- 10. Tabela antiga (migrada no passo 3)
-- ---------------------------------------------------------------------
drop table public.entitlements;
