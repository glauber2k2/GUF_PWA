-- =====================================================================
-- GUF APP · Perfil social, seguidores e competição (A017–A019 do mapa de dados,
-- RIPD em .lgpd/RIPD/ripd-social.md)
--
-- Toda conta tem um perfil social PRIVADO, com @ aleatório (editável). Por padrão só o
-- titular vê os próprios dados de treino; os outros veem o cartão do perfil (@, nome,
-- foto e contagem de seguidores) para poder pedir para seguir.
--   - Compartilhar exige o consentimento específico do documento 'social_sharing':
--     aceitar o 1º seguidor ou abrir o perfil. Revogar remove os seguidores e fecha o perfil.
--   - Perfil PRIVADO: seguidor aceito vê estatísticas, sequência e evolução.
--   - Perfil ABERTO: qualquer conta logada vê; seguir não precisa de aprovação.
--   - history_hidden: os registros de treino ficam só com o titular (as métricas e a
--     competição continuam). Medidas, observações e RPE nunca vão para outra pessoa.
--   - Seguimento mútuo aceito = competidores.
--
-- Leitura de dados de outra pessoa SÓ por funções SECURITY DEFINER que conferem a
-- permissão e devolvem campos mínimos. Nenhuma política RLS abre tabelas de treino.
--
-- Pontuação semanal (domingo a sábado; dia = início do treino no fuso do perfil):
-- constância (até 60) + esforço (RPE × minutos, até 40) + bônus de sequência (até 20).
-- Parâmetros fixos no servidor, por temporada (mês do sábado da semana); mudar vale só a
-- partir da temporada seguinte. O ranking (ordem e desempate) é montado no app a partir
-- dos números do servidor (packages/core/src/competition.ts).
--
-- Integridade: horários e tempo do treino passam a ser gravados só pelo servidor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Documento legal e auditoria
-- ---------------------------------------------------------------------
alter table public.legal_documents drop constraint legal_documents_doc_type_check;
alter table public.legal_documents add constraint legal_documents_doc_type_check
  check (doc_type in ('terms', 'privacy', 'health_consent', 'age_declaration', 'social_sharing'));

alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in (
    'consent_granted', 'consent_revoked', 'health_data_deleted', 'data_exported',
    'account_deleted', 'consent_proofs_purged', 'audit_log_purged',
    'social_data_deleted', 'social_visibility_changed', 'follow_accepted', 'follow_ended', 'user_blocked'));

-- ---------------------------------------------------------------------
-- 2. Treino: RPE da sessão e tempo gravado só pelo servidor
-- ---------------------------------------------------------------------
alter table public.workout_sessions
  add column session_rpe smallint check (session_rpe between 1 and 10);

comment on column public.workout_sessions.session_rpe is
  'Percepção de esforço da sessão (1–10), informada ao finalizar. Gravada só por set_session_rpe().';

-- Escrita direta pelo app (papel authenticated): o servidor decide horários e tempo.
-- finish_workout roda como o usuário e recebe os mesmos valores que já calculava;
-- jobs do servidor (pg_cron) não passam pela regra.
create or replace function public.guard_workout_session_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_active  integer;
  v_periods integer;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status         := 'in_progress';
    new.started_at     := now();
    new.finished_at    := null;
    new.active_seconds := null;
    new.auto_finished  := false;
    new.session_rpe    := null;
    return new;
  end if;

  if new.user_id is distinct from old.user_id
     or new.started_at is distinct from old.started_at
     or new.performed_on is distinct from old.performed_on
     or new.auto_finished is distinct from old.auto_finished
     or new.session_rpe is distinct from old.session_rpe then
    raise exception 'Este dado do treino não pode ser alterado diretamente' using errcode = '42501';
  end if;

  if old.status = 'completed' then
    if new.status <> 'completed'
       or new.finished_at is distinct from old.finished_at
       or new.active_seconds is distinct from old.active_seconds then
      raise exception 'Horários de um treino concluído não podem ser alterados' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status = 'completed' then
    select coalesce(sum(extract(epoch from (coalesce(p.ended_at, now()) - p.started_at))), 0)::integer, count(*)::integer
      into v_active, v_periods
      from public.workout_active_periods p
     where p.session_id = new.id;

    new.finished_at    := now();
    new.active_seconds := case when v_periods = 0
                               then greatest(extract(epoch from (now() - new.started_at))::integer, 0)
                               else greatest(v_active, 0) end;
  elsif new.finished_at is not null or new.active_seconds is not null then
    raise exception 'Horários do treino são definidos ao finalizar' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger workout_sessions_guard
  before insert or update on public.workout_sessions
  for each row execute function public.guard_workout_session_write();

-- Períodos ativos: só em treino em andamento, nunca no futuro, nunca antes do início
-- do treino e sem sobreposição (o tempo efetivo nunca passa do tempo real decorrido).
create or replace function public.guard_active_period_write()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_session public.workout_sessions;
begin
  if current_user <> 'authenticated' then
    return new;
  end if;

  select * into v_session from public.workout_sessions s where s.id = new.session_id;
  if not found or v_session.status <> 'in_progress' then
    raise exception 'Períodos só podem mudar em treino em andamento' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.started_at := least(greatest(new.started_at, v_session.started_at), now());
  elsif new.session_id is distinct from old.session_id
        or new.started_at is distinct from old.started_at
        or (old.ended_at is not null and new.ended_at is distinct from old.ended_at) then
    raise exception 'Período já encerrado não pode ser alterado' using errcode = '42501';
  end if;

  if new.ended_at is not null then
    new.ended_at := least(greatest(new.ended_at, new.started_at), now());
  end if;

  if exists (
    select 1 from public.workout_active_periods p
     where p.session_id = new.session_id
       and p.id <> new.id
       and tstzrange(p.started_at, coalesce(p.ended_at, 'infinity'::timestamptz))
           && tstzrange(new.started_at, coalesce(new.ended_at, 'infinity'::timestamptz))
  ) then
    raise exception 'Período sobreposto a outro do mesmo treino' using errcode = '23P01';
  end if;

  return new;
end;
$$;

create trigger workout_active_periods_guard
  before insert or update on public.workout_active_periods
  for each row execute function public.guard_active_period_write();

-- RPE da sessão: durante o treino ou até 24 h depois de finalizar.
create or replace function public.set_session_rpe(p_session_id uuid, p_rpe smallint)
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
  if p_rpe is null or p_rpe not between 1 and 10 then
    raise exception 'O esforço vai de 1 a 10' using errcode = '22023';
  end if;

  update public.workout_sessions s
     set session_rpe = p_rpe
   where s.id = p_session_id
     and s.user_id = v_uid
     and (s.status = 'in_progress' or s.finished_at > now() - interval '24 hours');

  if not found then
    raise exception 'Treino não encontrado ou fora do prazo para informar o esforço' using errcode = 'GS007';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Perfil social, seguidores e bloqueios
-- ---------------------------------------------------------------------
create table public.social_profiles (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  handle          text not null unique check (handle ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$'),
  visibility      text not null default 'private' check (visibility in ('private', 'open')),
  history_hidden  boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger social_profiles_updated_at before update on public.social_profiles
  for each row execute function public.set_updated_at();

create table public.follows (
  follower_id  uuid not null references auth.users (id) on delete cascade,
  followee_id  uuid not null references auth.users (id) on delete cascade,
  status       text not null check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_idx on public.follows (followee_id, status);

create table public.blocks (
  blocker_id  uuid not null references auth.users (id) on delete cascade,
  blocked_id  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

alter table public.social_profiles enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;

-- Só leitura do que é seu; toda gravação passa pelas funções abaixo (regras e auditoria).
create policy "perfil social: ler o próprio" on public.social_profiles
  for select to authenticated using (user_id = (select auth.uid()));

create policy "seguidores: ler os próprios vínculos" on public.follows
  for select to authenticated
  using (follower_id = (select auth.uid()) or followee_id = (select auth.uid()));

create policy "bloqueios: ler os próprios" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));

-- @ aleatório e único: guf. + 6 caracteres.
create or replace function public.random_social_handle()
returns text
language plpgsql volatile
set search_path = ''
as $$
declare
  v_handle text;
begin
  loop
    v_handle := 'guf.' || substr(md5(gen_random_uuid()::text), 1, 6);
    exit when not exists (select 1 from public.social_profiles sp where sp.handle = v_handle);
  end loop;
  return v_handle;
end;
$$;

-- Garante o perfil social (contas antigas ou criadas antes do gatilho).
create or replace function public.ensure_social_profile(p_user_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  insert into public.social_profiles (user_id, handle)
  values (p_user_id, public.random_social_handle())
  on conflict (user_id) do nothing;
end;
$$;

-- Cadastro: o perfil (profiles) nasce no handle_new_user; o perfil social nasce junto.
create or replace function public.create_social_profile_for_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  perform public.ensure_social_profile(new.id);
  return new;
end;
$$;

create trigger profiles_create_social_profile
  after insert on public.profiles
  for each row execute function public.create_social_profile_for_new_user();

insert into public.social_profiles (user_id, handle)
select p.id, public.random_social_handle()
  from public.profiles p
 where not exists (select 1 from public.social_profiles sp where sp.user_id = p.id);

-- ---------------------------------------------------------------------
-- 4. Consentimento de compartilhamento (documento social_sharing)
-- ---------------------------------------------------------------------
create or replace function public.has_social_consent(p_user_id uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select coalesce((
    select c.action = 'granted'
      from public.consent_records c
      join public.legal_documents d on d.id = c.document_id
     where c.user_id = p_user_id and d.doc_type = 'social_sharing'
     order by c.created_at desc
     limit 1), false);
$$;

create or replace function public.require_social_consent(p_user_id uuid)
returns void
language plpgsql stable
set search_path = ''
as $$
begin
  if not public.has_social_consent(p_user_id) then
    raise exception 'Autorize o compartilhamento para continuar' using errcode = 'GS009';
  end if;
end;
$$;

create or replace function public.grant_social_consent(p_platform text default 'web')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_doc uuid := (public.current_legal_document('social_sharing')).id;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_platform is not null and p_platform not in ('web', 'ios', 'android') then
    raise exception 'Plataforma inválida' using errcode = '22023';
  end if;
  if v_doc is null then
    raise exception 'Termo de compartilhamento não publicado' using errcode = 'GS003';
  end if;

  insert into public.consent_records (user_id, document_id, action, source, platform)
  values (v_uid, v_doc, 'granted', 'social_module', p_platform);
end;
$$;

-- Revogar: quem via seus dados deixa de ver (seguidores removidos, perfil volta a
-- privado). Pedidos pendentes e quem você segue continuam.
create or replace function public.revoke_social_consent(p_platform text default 'web')
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_doc       uuid := (public.current_legal_document('social_sharing')).id;
  v_followers integer;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_platform is not null and p_platform not in ('web', 'ios', 'android') then
    raise exception 'Plataforma inválida' using errcode = '22023';
  end if;

  delete from public.follows where followee_id = v_uid and status = 'accepted';
  get diagnostics v_followers = row_count;
  update public.social_profiles set visibility = 'private' where user_id = v_uid;

  if v_doc is not null then
    insert into public.consent_records (user_id, document_id, action, source, platform)
    values (v_uid, v_doc, 'revoked', 'settings', p_platform);
  end if;

  perform public.audit_log_append('social_data_deleted', v_uid, jsonb_build_object('followers_removed', v_followers));
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Parâmetros da pontuação (fixos no servidor, por temporada)
-- ---------------------------------------------------------------------
create table public.competition_parameters (
  effective_from              date primary key check (effective_from = date_trunc('month', effective_from)::date),
  sessions_for_max_constancy  smallint not null check (sessions_for_max_constancy > 0),
  constancy_max               numeric not null,
  effort_max                  numeric not null,
  reference_load              numeric not null check (reference_load > 0),
  min_minutes                 numeric not null,
  max_minutes                 numeric not null,
  bonus_per_week              numeric not null,
  bonus_max                   numeric not null,
  rpe_gap                     numeric not null,
  rpe_high_value              smallint not null,
  rpe_high_share              numeric not null,
  rpe_high_cap                numeric not null,
  rpe_window_days             smallint not null,
  created_at                  timestamptz not null default now()
);

comment on table public.competition_parameters is
  'Parâmetros da pontuação semanal. Linha nova só para temporada futura (mês seguinte em diante); nunca editar nem apagar.';

insert into public.competition_parameters (
  effective_from, sessions_for_max_constancy, constancy_max, effort_max, reference_load,
  min_minutes, max_minutes, bonus_per_week, bonus_max,
  rpe_gap, rpe_high_value, rpe_high_share, rpe_high_cap, rpe_window_days
) values ('2026-01-01', 3, 60, 40, 1800, 20, 120, 5, 20, 3, 9, 0.8, 7, 28);

alter table public.competition_parameters enable row level security;

-- Transparência (Art. 6º, VI; Art. 20, § 1º): todos podem ler as regras.
create policy "parâmetros da competição: leitura" on public.competition_parameters
  for select to authenticated using (true);

create or replace function public.competition_parameters_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.effective_from <= date_trunc('month', now())::date then
      raise exception 'Parâmetros novos valem só a partir da próxima temporada' using errcode = '22023';
    end if;
    return new;
  end if;
  raise exception 'Parâmetros publicados não podem ser alterados nem apagados' using errcode = '42501';
end;
$$;

create trigger competition_parameters_guard
  before insert or update or delete on public.competition_parameters
  for each row execute function public.competition_parameters_guard();

-- Parâmetros da temporada (1º dia do mês); antes do primeiro registro, vale o mais antigo.
create or replace function public.competition_params_for(p_season date)
returns public.competition_parameters
language sql stable
set search_path = ''
as $$
  select cp.*
    from public.competition_parameters cp
   order by (cp.effective_from <= p_season) desc,
            case when cp.effective_from <= p_season then cp.effective_from end desc,
            cp.effective_from
   limit 1;
$$;

-- Temporada de uma semana = mês do sábado em que ela termina.
create or replace function public.competition_season_of(p_week_start date)
returns date
language sql immutable
set search_path = ''
as $$
  select date_trunc('month', p_week_start + 6)::date;
$$;

-- Hoje no fuso do perfil.
create or replace function public.local_today(p_user_id uuid)
returns date
language sql stable
set search_path = ''
as $$
  select (now() at time zone coalesce(
            (select p.timezone from public.profiles p where p.id = p_user_id), 'America/Sao_Paulo'))::date;
$$;

-- ---------------------------------------------------------------------
-- 6. Cálculo da pontuação (só servidor)
-- ---------------------------------------------------------------------

-- Uma linha por treino concluído: dia no fuso do perfil (pelo início real, gravado pelo
-- servidor), minutos considerados, RPE usado e carga. counted = sessão que vale no dia
-- (no máximo uma por dia: a válida de maior carga).
create or replace function public.competition_session_scores(p_user_id uuid, p_from date, p_to date)
returns table (
  session_id          uuid,
  training_day        date,
  week_start          date,
  minutes_considered  numeric,
  is_valid            boolean,
  rpe_informed        smallint,
  rpe_used            numeric,
  rpe_flag            text,
  session_load        numeric,
  counted             boolean
)
language sql stable
set search_path = ''
as $$
  with zone as (
    select coalesce((select p.timezone from public.profiles p where p.id = p_user_id), 'America/Sao_Paulo') as tz
  ),
  sessions as (
    select s.id as sid,
           s.session_rpe as rpe,
           (s.started_at at time zone z.tz)::date as day,
           coalesce(s.active_seconds, extract(epoch from (s.finished_at - s.started_at)))::numeric / 60 as minutes
      from public.workout_sessions s
      cross join zone z
     where s.user_id = p_user_id and s.status = 'completed'
  ),
  with_params as (
    select x.sid, x.rpe, x.day, x.minutes,
           x.day - extract(dow from x.day)::integer as wk,
           cp.min_minutes, cp.max_minutes, cp.rpe_gap, cp.rpe_high_value,
           cp.rpe_high_share, cp.rpe_high_cap, cp.rpe_window_days
      from sessions x
      cross join lateral public.competition_params_for(
        public.competition_season_of(x.day - extract(dow from x.day)::integer)) cp
  ),
  first_day as (
    select min(w.day) as d from with_params w
  ),
  scored as (
    select w.*,
           w.minutes >= w.min_minutes as valid,
           least(w.minutes, w.max_minutes) as considered,
           (select f.d from first_day f) <= w.day - w.rpe_window_days as has_history,
           win.n, win.avg_rpe, win.high_n
      from with_params w
      left join lateral (
        select count(*) as n,
               avg(o.rpe) as avg_rpe,
               count(*) filter (where o.rpe >= w.rpe_high_value) as high_n
          from with_params o
         where o.rpe is not null
           and o.minutes >= o.min_minutes
           and o.day < w.day
           and o.day >= w.day - w.rpe_window_days
      ) win on true
     where w.day between p_from and p_to
  ),
  flagged as (
    select s.*,
           case
             when s.rpe is null or not s.has_history or s.n = 0 then null
             when s.rpe >= s.rpe_high_value and s.high_n::numeric / s.n > s.rpe_high_share then 'high_share'
             when s.rpe - s.avg_rpe >= s.rpe_gap then 'above_average'
           end as flag
      from scored s
  ),
  loaded as (
    select f.*,
           (case f.flag
              when 'high_share'    then least(f.rpe, f.rpe_high_cap)
              when 'above_average' then round(f.avg_rpe, 1)
              else f.rpe
            end)::numeric as used
      from flagged f
  ),
  totals as (
    select l.*,
           case when l.valid then coalesce(l.used, 0) * l.considered else 0 end as sload
      from loaded l
  )
  select f.sid, f.day, f.wk, round(f.considered, 1), f.valid, f.rpe, f.used, f.flag, round(f.sload, 1),
         f.valid and row_number() over (partition by f.day order by f.valid desc, f.sload desc, f.sid) = 1
    from totals f;
$$;

-- Uma linha por semana (domingo) do primeiro treino até a semana de p_to.
-- consecutive_weeks atravessa temporadas (é constância contínua).
create or replace function public.competition_week_scores(p_user_id uuid, p_to date)
returns table (
  week_start         date,
  valid_sessions     integer,
  weekly_load        numeric,
  constancy_points   numeric,
  effort_points      numeric,
  bonus_points       numeric,
  points             integer,
  fulfilled          boolean,
  consecutive_weeks  integer
)
language sql stable
set search_path = ''
as $$
  with sess as (
    select * from public.competition_session_scores(p_user_id, date '2000-01-01', p_to)
  ),
  agg as (
    select s.week_start as wk,
           (count(*) filter (where s.counted))::integer as n,
           coalesce(sum(s.session_load) filter (where s.counted), 0) as wl
      from sess s
     group by s.week_start
  ),
  weeks as (
    select g::date as wk
      from (select min(a.wk) as first_wk from agg a) b,
           generate_series(b.first_wk, p_to - extract(dow from p_to)::integer, interval '1 week') g
     where b.first_wk is not null
  ),
  base as (
    select w.wk, coalesce(a.n, 0) as n, coalesce(a.wl, 0) as wl,
           cp.sessions_for_max_constancy as smax, cp.constancy_max, cp.effort_max, cp.reference_load,
           cp.bonus_per_week, cp.bonus_max
      from weeks w
      left join agg a on a.wk = w.wk
      cross join lateral public.competition_params_for(public.competition_season_of(w.wk)) cp
  ),
  marked as (
    select b.*,
           b.n >= b.smax as ok,
           count(*) filter (where b.n < b.smax) over (order by b.wk) as grp
      from base b
  ),
  streaked as (
    select m.*,
           (sum(case when m.ok then 1 else 0 end) over (partition by m.grp order by m.wk))::integer as consec
      from marked m
  ),
  pointed as (
    select s.*,
           least(s.n, s.smax) * s.constancy_max / s.smax as constancy,
           least(s.effort_max, s.wl / s.reference_load * s.effort_max) as effort,
           case when s.ok then least(s.bonus_max, s.bonus_per_week * s.consec) else 0 end as bonus
      from streaked s
  )
  select p.wk, p.n, round(p.wl, 1), round(p.constancy, 2), round(p.effort, 2), p.bonus,
         round(p.constancy + p.effort + p.bonus)::integer,
         p.ok, case when p.ok then p.consec else 0 end
    from pointed p;
$$;

-- Recordes de carga por treino: carga máxima de um exercício maior que a de todos os
-- treinos concluídos antes (mesma regra do finish_workout; primeira vez não conta).
create or replace function public.session_load_records(p_user_id uuid)
returns table (session_id uuid, performed_on date, records integer)
language sql stable
set search_path = ''
as $$
  with per_exercise as (
    select s.id as sid, s.performed_on as day, s.finished_at, sl.exercise_id, max(sl.weight_kg) as best
      from public.workout_sessions s
      join public.set_logs sl on sl.session_id = s.id
     where s.user_id = p_user_id and s.status = 'completed'
       and sl.is_completed and sl.set_type <> 'warmup' and sl.weight_kg is not null
     group by s.id, s.performed_on, s.finished_at, sl.exercise_id
  ),
  compared as (
    select pe.*,
           max(pe.best) over (partition by pe.exercise_id order by pe.finished_at, pe.sid
                              rows between unbounded preceding and 1 preceding) as previous_best
      from per_exercise pe
  )
  select c.sid, c.day, (count(*) filter (where c.previous_best is not null and c.best > c.previous_best))::integer
    from compared c
   group by c.sid, c.day;
$$;

-- ---------------------------------------------------------------------
-- 7. Sequência de qualquer pessoa (a regra do get_streak, por usuário)
-- ---------------------------------------------------------------------
create or replace function public.streak_for(p_user_id uuid)
returns table (
  current_streak      integer,
  best_streak         integer,
  current_week_count  integer,
  week_secured        boolean,
  streak_at_risk      boolean
)
language sql stable
set search_path = ''
as $$
  with today as (
    select public.local_today(p_user_id) as d
  ),
  params as (
    select (t.d - extract(dow from t.d)::integer) as cur_week from today t
  ),
  weeks_done as (
    select (ws.performed_on - extract(dow from ws.performed_on)::integer) as wk, count(*)::integer as n
      from public.workout_sessions ws
     where ws.user_id = p_user_id and ws.status = 'completed'
     group by 1
  ),
  series as (
    select g::date as wk
      from params,
           generate_series(
             (select coalesce(min(wk), params.cur_week) from weeks_done),
             params.cur_week,
             interval '1 week') as g
  ),
  marked as (
    select s.wk,
           coalesce(w.n, 0) >= 1 as trained,
           s.wk = p.cur_week as is_current
      from series s
      cross join params p
      left join weeks_done w on w.wk = s.wk
  ),
  counted as (
    select * from marked where not (is_current and not trained)
  ),
  last_break as (
    select max(wk) as wk from counted where not trained
  ),
  islands as (
    select trained,
           row_number() over (order by wk) - row_number() over (partition by trained order by wk) as grp
      from counted
  ),
  result as (
    select
      (select count(*)::integer from counted
        where trained and wk > coalesce((select wk from last_break), '-infinity'::date)) as current_streak,
      coalesce((select max(cnt)::integer from (
                 select count(*) as cnt from islands where trained group by grp) t), 0) as best_streak,
      coalesce((select w.n from weeks_done w, params p where w.wk = p.cur_week), 0) as current_week_count
  )
  select r.current_streak,
         r.best_streak,
         r.current_week_count,
         r.current_week_count >= 1,
         r.current_week_count = 0 and r.current_streak > 0
    from result r;
$$;

-- Mesmo contrato de antes; a regra agora mora em streak_for.
create or replace function public.get_streak()
returns table (
  current_streak      integer,
  best_streak         integer,
  current_week_count  integer,
  week_secured        boolean,
  streak_at_risk      boolean
)
language sql stable
set search_path = ''
as $$
  select * from public.streak_for((select auth.uid()));
$$;

-- ---------------------------------------------------------------------
-- 8. Regras de acesso entre pessoas
-- ---------------------------------------------------------------------
create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks b
     where (b.blocker_id = p_a and b.blocked_id = p_b)
        or (b.blocker_id = p_b and b.blocked_id = p_a)
  );
$$;

-- Vê estatísticas, sequência e evolução: o titular, seguidor aceito ou perfil aberto.
create or replace function public.can_view_member(p_viewer uuid, p_owner uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select p_viewer = p_owner
      or (not public.is_blocked_between(p_viewer, p_owner)
          and (exists (select 1 from public.follows f
                        where f.follower_id = p_viewer and f.followee_id = p_owner and f.status = 'accepted')
               or exists (select 1 from public.social_profiles sp
                           where sp.user_id = p_owner and sp.visibility = 'open')));
$$;

-- Vê os registros de treino: além do anterior, o titular não ocultou o histórico.
create or replace function public.can_view_member_history(p_viewer uuid, p_owner uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select p_viewer = p_owner
      or (public.can_view_member(p_viewer, p_owner)
          and exists (select 1 from public.social_profiles sp
                       where sp.user_id = p_owner and not sp.history_hidden));
$$;

-- Competidores: seguimento mútuo aceito.
create or replace function public.competitors_of(p_user_id uuid)
returns table (competitor_id uuid)
language sql stable
set search_path = ''
as $$
  select f1.followee_id
    from public.follows f1
    join public.follows f2 on f2.follower_id = f1.followee_id and f2.followee_id = f1.follower_id
   where f1.follower_id = p_user_id and f1.status = 'accepted' and f2.status = 'accepted';
$$;

-- Relação de quem pergunta com outra pessoa: self · following · requested · none
create or replace function public.social_relationship(p_viewer uuid, p_other uuid)
returns text
language sql stable
set search_path = ''
as $$
  select case
           when p_viewer = p_other then 'self'
           else coalesce((select case f.status when 'accepted' then 'following' else 'requested' end
                            from public.follows f
                           where f.follower_id = p_viewer and f.followee_id = p_other), 'none')
         end;
$$;

create or replace function public.normalize_handle(p_handle text)
returns text
language sql immutable
set search_path = ''
as $$
  select lower(btrim(regexp_replace(coalesce(p_handle, ''), '^@', '')));
$$;

-- ---------------------------------------------------------------------
-- 9. Meu perfil social: @, visibilidade e histórico
-- ---------------------------------------------------------------------
create or replace function public.get_my_social()
returns table (
  user_id                 uuid,
  handle                  text,
  visibility              text,
  history_hidden          boolean,
  has_consent             boolean,
  followers_count         integer,
  following_count         integer,
  pending_requests_count  integer
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
begin
  perform public.ensure_social_profile(v_uid);

  return query
  select sp.user_id, sp.handle, sp.visibility, sp.history_hidden,
         public.has_social_consent(v_uid),
         (select count(*) from public.follows f where f.followee_id = v_uid and f.status = 'accepted')::integer,
         (select count(*) from public.follows f where f.follower_id = v_uid and f.status = 'accepted')::integer,
         (select count(*) from public.follows f where f.followee_id = v_uid and f.status = 'pending')::integer
    from public.social_profiles sp
   where sp.user_id = v_uid;
end;
$$;

create or replace function public.update_social_handle(p_handle text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_handle text := public.normalize_handle(p_handle);
begin
  perform public.ensure_social_profile(v_uid);
  if v_handle !~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' then
    raise exception 'Nome de usuário inválido' using errcode = 'GS008';
  end if;
  begin
    update public.social_profiles set handle = v_handle where user_id = v_uid;
  exception when unique_violation then
    raise exception 'Esse nome de usuário já está em uso' using errcode = 'GS002';
  end;
end;
$$;

-- Abrir o perfil exige o consentimento e aceita os pedidos pendentes (quem pediu passa a
-- ver o que o perfil mostra). Ocultar o histórico não exige consentimento.
create or replace function public.update_social_settings(p_visibility text, p_history_hidden boolean)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_old      public.social_profiles;
  v_accepted integer := 0;
begin
  perform public.ensure_social_profile(v_uid);
  if p_visibility not in ('private', 'open') or p_history_hidden is null then
    raise exception 'Configuração inválida' using errcode = '22023';
  end if;

  select * into v_old from public.social_profiles sp where sp.user_id = v_uid for update;
  if v_old.visibility = p_visibility and v_old.history_hidden = p_history_hidden then
    return;
  end if;
  if p_visibility = 'open' and v_old.visibility = 'private' then
    perform public.require_social_consent(v_uid);
  end if;

  update public.social_profiles
     set visibility = p_visibility, history_hidden = p_history_hidden
   where user_id = v_uid;

  if p_visibility = 'open' and v_old.visibility = 'private' then
    update public.follows
       set status = 'accepted', accepted_at = now()
     where followee_id = v_uid and status = 'pending';
    get diagnostics v_accepted = row_count;
  end if;

  perform public.audit_log_append('social_visibility_changed', v_uid, jsonb_build_object(
    'visibility', p_visibility, 'history_hidden', p_history_hidden, 'accepted_pending', v_accepted));
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Seguir, aceitar, remover e bloquear
-- ---------------------------------------------------------------------

-- Pessoa inexistente ou com bloqueio: mesma resposta (não revela o bloqueio).
create or replace function public.request_follow(p_user_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_target  public.social_profiles;
  v_current text;
  v_status  text;
begin
  perform public.ensure_social_profile(v_uid);

  select * into v_target from public.social_profiles sp where sp.user_id = p_user_id;
  if not found or p_user_id = v_uid or public.is_blocked_between(v_uid, p_user_id) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;

  select f.status into v_current from public.follows f where f.follower_id = v_uid and f.followee_id = p_user_id;
  if found then
    return v_current;
  end if;

  if (select count(*) from public.follows f
       where f.follower_id = v_uid and f.created_at > now() - interval '1 day') >= 50 then
    raise exception 'Limite de pedidos para seguir atingido. Tente de novo amanhã.' using errcode = 'GS005';
  end if;

  v_status := case v_target.visibility when 'open' then 'accepted' else 'pending' end;
  insert into public.follows (follower_id, followee_id, status, accepted_at)
  values (v_uid, p_user_id, v_status, case when v_status = 'accepted' then now() end);

  if v_status = 'accepted' then
    perform public.audit_log_append('follow_accepted', p_user_id, jsonb_build_object('follower', v_uid, 'mode', 'open'));
  end if;
  return v_status;
end;
$$;

-- Aceitar exige o consentimento de compartilhamento (recusar, não).
create or replace function public.respond_follow_request(p_user_id uuid, p_accept boolean)
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

  if p_accept then
    perform public.require_social_consent(v_uid);
    update public.follows
       set status = 'accepted', accepted_at = now()
     where follower_id = p_user_id and followee_id = v_uid and status = 'pending';
    if found then
      perform public.audit_log_append('follow_accepted', v_uid, jsonb_build_object('follower', p_user_id, 'mode', 'request'));
    end if;
  else
    delete from public.follows
     where follower_id = p_user_id and followee_id = v_uid and status = 'pending';
  end if;
end;
$$;

create or replace function public.unfollow(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_status text;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  delete from public.follows
   where follower_id = v_uid and followee_id = p_user_id
  returning status into v_status;
  if v_status = 'accepted' then
    perform public.audit_log_append('follow_ended', p_user_id, jsonb_build_object('follower', v_uid, 'by', 'follower'));
  end if;
end;
$$;

create or replace function public.remove_follower(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid    uuid := (select auth.uid());
  v_status text;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  delete from public.follows
   where follower_id = p_user_id and followee_id = v_uid
  returning status into v_status;
  if v_status = 'accepted' then
    perform public.audit_log_append('follow_ended', v_uid, jsonb_build_object('follower', p_user_id, 'by', 'followee'));
  end if;
end;
$$;

create or replace function public.block_user(p_user_id uuid)
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
  if p_user_id is null or p_user_id = v_uid or not exists (select 1 from auth.users u where u.id = p_user_id) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;

  insert into public.blocks (blocker_id, blocked_id) values (v_uid, p_user_id)
  on conflict do nothing;
  delete from public.follows
   where (follower_id = v_uid and followee_id = p_user_id)
      or (follower_id = p_user_id and followee_id = v_uid);

  perform public.audit_log_append('user_blocked', v_uid, jsonb_build_object('blocked', p_user_id));
end;
$$;

create or replace function public.unblock_user(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  delete from public.blocks where blocker_id = (select auth.uid()) and blocked_id = p_user_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 11. Listas, busca e cartão do perfil (campos mínimos: id, @, nome, foto)
-- ---------------------------------------------------------------------

-- p_user_id nulo = as suas listas. De outra pessoa: só seguidores/seguindo e só se você
-- pode ver o perfil dela. Pedidos (recebidos e enviados) e bloqueios são só seus.
create or replace function public.list_social_connections(p_kind text, p_user_id uuid default null)
returns table (
  user_id     uuid,
  handle      text,
  name        text,
  avatar_url  text,
  status      text,
  is_mutual   boolean,
  since       timestamptz
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid   uuid := (select auth.uid());
  v_owner uuid := coalesce(p_user_id, (select auth.uid()));
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_kind not in ('followers', 'following', 'requests', 'sent', 'blocked') then
    raise exception 'Lista inválida' using errcode = '22023';
  end if;
  if v_owner <> v_uid and (p_kind not in ('followers', 'following') or not public.can_view_member(v_uid, v_owner)) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;

  return query
  with picked as (
    select f.follower_id as other, f.status as st, coalesce(f.accepted_at, f.created_at) as at
      from public.follows f
     where p_kind in ('followers', 'requests') and f.followee_id = v_owner
       and f.status = case p_kind when 'followers' then 'accepted' else 'pending' end
    union all
    select f.followee_id, f.status, coalesce(f.accepted_at, f.created_at)
      from public.follows f
     where p_kind in ('following', 'sent') and f.follower_id = v_owner
       and f.status = case p_kind when 'following' then 'accepted' else 'pending' end
    union all
    select b.blocked_id, 'blocked', b.created_at
      from public.blocks b
     where p_kind = 'blocked' and b.blocker_id = v_owner
  )
  select p.other, sp.handle, pr.name, pr.avatar_url, p.st,
         exists (select 1 from public.competitors_of(v_owner) c where c.competitor_id = p.other),
         p.at
    from picked p
    left join public.social_profiles sp on sp.user_id = p.other
    left join public.profiles pr on pr.id = p.other
   where p_kind = 'blocked' or not public.is_blocked_between(v_uid, p.other)
   order by p.at desc;
end;
$$;

-- Busca por @ (prefixo) ou nome (início de qualquer palavra); mínimo 3 caracteres, até 20.
create or replace function public.search_social_profiles(p_query text)
returns table (
  user_id       uuid,
  handle        text,
  name          text,
  avatar_url    text,
  visibility    text,
  relationship  text,
  follows_you   boolean
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid  uuid := (select auth.uid());
  v_q    text := public.normalize_handle(p_query);
  v_name text := lower(btrim(coalesce(p_query, '')));
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if char_length(v_q) < 3 then
    return;
  end if;

  return query
  select sp.user_id, sp.handle, pr.name, pr.avatar_url, sp.visibility,
         public.social_relationship(v_uid, sp.user_id),
         exists (select 1 from public.follows f
                  where f.follower_id = sp.user_id and f.followee_id = v_uid and f.status = 'accepted')
    from public.social_profiles sp
    left join public.profiles pr on pr.id = sp.user_id
   where (left(sp.handle, char_length(v_q)) = v_q
          or exists (select 1 from regexp_split_to_table(lower(coalesce(pr.name, '')), '\s+') w
                      where left(w, char_length(v_name)) = v_name))
     and sp.user_id <> v_uid
     and not public.is_blocked_between(v_uid, sp.user_id)
   order by (left(sp.handle, char_length(v_q)) = v_q) desc, char_length(sp.handle), sp.handle
   limit 20;
end;
$$;

-- Id pelo @ (link de convite /pessoa?u=@handle).
create or replace function public.find_social_profile(p_handle text)
returns uuid
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  select sp.user_id into v_owner
    from public.social_profiles sp
   where sp.handle = public.normalize_handle(p_handle);
  if v_owner is null or public.is_blocked_between(v_uid, v_owner) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;
  return v_owner;
end;
$$;

-- Perfil de qualquer pessoa (ou o seu). Cartão (@, nome, foto, seguidores, seguindo)
-- para qualquer conta logada; números de treino e sequência só se puder ver o perfil.
create or replace function public.get_member_profile(p_user_id uuid default null)
returns table (
  user_id             uuid,
  handle              text,
  name                text,
  avatar_url          text,
  visibility          text,
  history_hidden      boolean,
  is_self             boolean,
  relationship        text,
  follows_you         boolean,
  is_competitor       boolean,
  unlocked            boolean,
  history_visible     boolean,
  followers_count     integer,
  following_count     integer,
  workouts_count      integer,
  first_workout_on    date,
  current_streak      integer,
  best_streak         integer,
  recent_weeks        boolean[]
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid      uuid := (select auth.uid());
  v_owner    uuid := coalesce(p_user_id, (select auth.uid()));
  v_unlocked boolean;
  v_today    date;
  v_week     date;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if v_owner = v_uid then
    perform public.ensure_social_profile(v_uid);
  end if;
  if not exists (select 1 from public.social_profiles sp where sp.user_id = v_owner)
     or public.is_blocked_between(v_uid, v_owner) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;

  v_unlocked := public.can_view_member(v_uid, v_owner);
  v_today    := public.local_today(v_owner);
  v_week     := v_today - extract(dow from v_today)::integer;

  return query
  with streak as (
    select * from public.streak_for(v_owner)
  ),
  trained_weeks as (
    select distinct (ws.performed_on - extract(dow from ws.performed_on)::integer) as wk
      from public.workout_sessions ws
     where ws.user_id = v_owner and ws.status = 'completed'
       and ws.performed_on >= v_week - 7 * 7
  )
  select sp.user_id, sp.handle, pr.name, pr.avatar_url, sp.visibility, sp.history_hidden,
         v_owner = v_uid,
         public.social_relationship(v_uid, v_owner),
         exists (select 1 from public.follows f
                  where f.follower_id = v_owner and f.followee_id = v_uid and f.status = 'accepted'),
         exists (select 1 from public.competitors_of(v_uid) c where c.competitor_id = v_owner),
         v_unlocked,
         public.can_view_member_history(v_uid, v_owner),
         (select count(*) from public.follows f where f.followee_id = v_owner and f.status = 'accepted')::integer,
         (select count(*) from public.follows f where f.follower_id = v_owner and f.status = 'accepted')::integer,
         case when v_unlocked then
           (select count(*) from public.workout_sessions ws where ws.user_id = v_owner and ws.status = 'completed')::integer
         end,
         case when v_unlocked then
           (select min(ws.performed_on) from public.workout_sessions ws where ws.user_id = v_owner and ws.status = 'completed')
         end,
         case when v_unlocked then (select s.current_streak from streak s) end,
         case when v_unlocked then (select s.best_streak from streak s) end,
         case when v_unlocked then
           array(select exists (select 1 from trained_weeks t where t.wk = v_week - 7 * g)
                   from generate_series(7, 0, -1) g order by g desc)
         end
    from public.social_profiles sp
    left join public.profiles pr on pr.id = sp.user_id
   where sp.user_id = v_owner;
end;
$$;

-- Evolução por semana (gráfico do perfil): volume, carga máxima e tempo efetivo.
create or replace function public.get_member_evolution(p_user_id uuid default null, p_weeks integer default 26)
returns table (
  week_start      date,
  sessions        integer,
  volume_kg       numeric,
  max_weight_kg   numeric,
  active_seconds  integer
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid   uuid := (select auth.uid());
  v_owner uuid := coalesce(p_user_id, (select auth.uid()));
  v_today date;
  v_first date;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if not public.can_view_member(v_uid, v_owner) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;
  v_today := public.local_today(v_owner);
  v_first := v_today - extract(dow from v_today)::integer - 7 * (least(greatest(coalesce(p_weeks, 26), 1), 104) - 1);

  return query
  with sessions as (
    select s.id, s.performed_on - extract(dow from s.performed_on)::integer as wk,
           coalesce(s.active_seconds, extract(epoch from (s.finished_at - s.started_at))::integer) as secs
      from public.workout_sessions s
     where s.user_id = v_owner and s.status = 'completed' and s.performed_on >= v_first
  ),
  sets as (
    select x.wk, sl.weight_kg, sl.reps
      from sessions x
      join public.set_logs sl on sl.session_id = x.id
     where sl.is_completed and sl.set_type <> 'warmup'
  )
  select g::date,
         (select count(*) from sessions x where x.wk = g::date)::integer,
         (select coalesce(sum(st.weight_kg * st.reps), 0) from sets st where st.wk = g::date),
         (select coalesce(max(st.weight_kg), 0) from sets st where st.wk = g::date),
         (select coalesce(sum(x.secs), 0) from sessions x where x.wk = g::date)::integer
    from generate_series(v_first, v_today - extract(dow from v_today)::integer, interval '1 week') g
   order by 1;
end;
$$;

-- Registros de treino (sem observações, sem RPE): só com o histórico visível.
create or replace function public.list_member_workouts(p_user_id uuid default null, p_before timestamptz default null, p_limit integer default 20)
returns table (
  session_id        uuid,
  performed_on      date,
  finished_at       timestamptz,
  name              text,
  duration_seconds  integer,
  sets              integer,
  volume_kg         numeric,
  records           integer
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid   uuid := (select auth.uid());
  v_owner uuid := coalesce(p_user_id, (select auth.uid()));
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if not public.can_view_member(v_uid, v_owner) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;
  if not public.can_view_member_history(v_uid, v_owner) then
    raise exception 'Esta pessoa ocultou o histórico de treinos' using errcode = 'GS006';
  end if;

  return query
  with page as (
    select s.*
      from public.workout_sessions s
     where s.user_id = v_owner
       and s.status = 'completed'
       and (p_before is null or s.finished_at < p_before)
     order by s.finished_at desc
     limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select s.id, s.performed_on, s.finished_at, s.name,
         coalesce(s.active_seconds, extract(epoch from (s.finished_at - s.started_at))::integer),
         (select count(*) from public.set_logs sl
           where sl.session_id = s.id and sl.is_completed and sl.set_type <> 'warmup')::integer,
         (select coalesce(sum(sl.weight_kg * sl.reps), 0) from public.set_logs sl
           where sl.session_id = s.id and sl.is_completed and sl.set_type <> 'warmup'),
         coalesce((select r.records from public.session_load_records(v_owner) r where r.session_id = s.id), 0)
    from page s
   order by s.finished_at desc;
end;
$$;

-- ---------------------------------------------------------------------
-- 12. Competição (você + quem você segue e te segue)
-- ---------------------------------------------------------------------
create or replace function public.get_competition_participants()
returns table (
  user_id         uuid,
  handle          text,
  name            text,
  avatar_url      text,
  is_me           boolean,
  current_streak  integer
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
begin
  perform public.ensure_social_profile(v_uid);

  return query
  select pp.uid, sp.handle, pr.name, pr.avatar_url, pp.uid = v_uid,
         (select s.current_streak from public.streak_for(pp.uid) s)
    from (select v_uid as uid union select c.competitor_id from public.competitors_of(v_uid) c) pp
    join public.social_profiles sp on sp.user_id = pp.uid
    left join public.profiles pr on pr.id = pp.uid;
end;
$$;

-- Pontos por semana de cada participante: semanas que tocam o período (até 400 dias).
create or replace function public.get_competition_weeks(p_from date, p_to date)
returns table (
  user_id           uuid,
  week_start        date,
  points            integer,
  constancy_points  numeric,
  effort_points     numeric,
  bonus_points      numeric,
  valid_sessions    integer,
  weekly_load       numeric,
  fulfilled         boolean
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
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Período inválido' using errcode = '22023';
  end if;

  return query
  select pp.uid, w.week_start, w.points, w.constancy_points, w.effort_points, w.bonus_points,
         w.valid_sessions, w.weekly_load, w.fulfilled
    from (select v_uid as uid union select c.competitor_id from public.competitors_of(v_uid) c) pp
    cross join lateral public.competition_week_scores(pp.uid, least(p_to, public.local_today(pp.uid))) w
   where w.week_start between p_from - extract(dow from p_from)::integer and p_to
   order by pp.uid, w.week_start;
end;
$$;

-- Treinos, volume e recordes por dia de cada participante (até 400 dias).
create or replace function public.get_competition_days(p_from date, p_to date)
returns table (
  user_id    uuid,
  day        date,
  workouts   integer,
  volume_kg  numeric,
  records    integer
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
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Período inválido' using errcode = '22023';
  end if;

  return query
  with people as (
    select v_uid as uid union select c.competitor_id from public.competitors_of(v_uid) c
  ),
  sessions as (
    select pp.uid, s.id, s.performed_on
      from people pp
      join public.workout_sessions s on s.user_id = pp.uid
     where s.status = 'completed' and s.performed_on between p_from and p_to
  ),
  session_records as (
    select r.session_id, r.records
      from people pp
      cross join lateral public.session_load_records(pp.uid) r
     where r.performed_on between p_from and p_to
  ),
  session_volume as (
    select x.id, coalesce(sum(sl.weight_kg * sl.reps), 0) as volume
      from sessions x
      left join public.set_logs sl on sl.session_id = x.id and sl.is_completed and sl.set_type <> 'warmup'
     group by x.id
  )
  select x.uid, x.performed_on,
         count(*)::integer,
         coalesce(sum(v.volume), 0),
         coalesce(sum(r.records), 0)::integer
    from sessions x
    join session_volume v on v.id = x.id
    left join session_records r on r.session_id = x.id
   group by x.uid, x.performed_on
   order by x.uid, x.performed_on;
end;
$$;

-- Suas sessões no período, com o ajuste de RPE explicado (Art. 20: transparência e
-- revisão de decisão automatizada).
create or replace function public.get_my_competition_sessions(p_from date, p_to date)
returns table (
  session_id          uuid,
  name                text,
  training_day        date,
  minutes_considered  numeric,
  is_valid            boolean,
  counted             boolean,
  rpe_informed        smallint,
  rpe_used            numeric,
  rpe_flag            text,
  session_load        numeric
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
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Período inválido' using errcode = '22023';
  end if;

  return query
  select sc.session_id, s.name, sc.training_day, sc.minutes_considered, sc.is_valid, sc.counted,
         sc.rpe_informed, sc.rpe_used, sc.rpe_flag, sc.session_load
    from public.competition_session_scores(v_uid, p_from, p_to) sc
    join public.workout_sessions s on s.id = sc.session_id
   order by sc.training_day desc, sc.session_load desc;
end;
$$;

-- ---------------------------------------------------------------------
-- 13. Exportação (guf-export/3): inclui perfil social, vínculos e bloqueios
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
    'formato',                   'guf-export/3',
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
    'format', 'guf-export/3',
    'workouts', jsonb_array_length(v_result -> 'treinos'),
    'measurements', jsonb_array_length(v_result -> 'medidas')
  ));

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 14. Permissões
-- ---------------------------------------------------------------------
revoke execute on function
  public.guard_workout_session_write(),
  public.guard_active_period_write(),
  public.competition_parameters_guard(),
  public.create_social_profile_for_new_user(),
  public.random_social_handle(),
  public.ensure_social_profile(uuid),
  public.has_social_consent(uuid),
  public.require_social_consent(uuid),
  public.competition_params_for(date),
  public.competition_season_of(date),
  public.local_today(uuid),
  public.competition_session_scores(uuid, date, date),
  public.competition_week_scores(uuid, date),
  public.session_load_records(uuid),
  public.streak_for(uuid),
  public.is_blocked_between(uuid, uuid),
  public.can_view_member(uuid, uuid),
  public.can_view_member_history(uuid, uuid),
  public.competitors_of(uuid),
  public.social_relationship(uuid, uuid),
  public.normalize_handle(text)
from public, anon, authenticated;

revoke execute on function
  public.get_streak(),
  public.set_session_rpe(uuid, smallint),
  public.grant_social_consent(text),
  public.revoke_social_consent(text),
  public.get_my_social(),
  public.update_social_handle(text),
  public.update_social_settings(text, boolean),
  public.request_follow(uuid),
  public.respond_follow_request(uuid, boolean),
  public.unfollow(uuid),
  public.remove_follower(uuid),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.list_social_connections(text, uuid),
  public.search_social_profiles(text),
  public.find_social_profile(text),
  public.get_member_profile(uuid),
  public.get_member_evolution(uuid, integer),
  public.list_member_workouts(uuid, timestamptz, integer),
  public.get_competition_participants(),
  public.get_competition_weeks(date, date),
  public.get_competition_days(date, date),
  public.get_my_competition_sessions(date, date)
from public, anon;

grant execute on function
  public.get_streak(),
  public.set_session_rpe(uuid, smallint),
  public.grant_social_consent(text),
  public.revoke_social_consent(text),
  public.get_my_social(),
  public.update_social_handle(text),
  public.update_social_settings(text, boolean),
  public.request_follow(uuid),
  public.respond_follow_request(uuid, boolean),
  public.unfollow(uuid),
  public.remove_follower(uuid),
  public.block_user(uuid),
  public.unblock_user(uuid),
  public.list_social_connections(text, uuid),
  public.search_social_profiles(text),
  public.find_social_profile(text),
  public.get_member_profile(uuid),
  public.get_member_evolution(uuid, integer),
  public.list_member_workouts(uuid, timestamptz, integer),
  public.get_competition_participants(),
  public.get_competition_weeks(date, date),
  public.get_competition_days(date, date),
  public.get_my_competition_sessions(date, date)
to authenticated;

revoke insert, update, delete on public.social_profiles, public.follows, public.blocks, public.competition_parameters
  from anon, authenticated;
