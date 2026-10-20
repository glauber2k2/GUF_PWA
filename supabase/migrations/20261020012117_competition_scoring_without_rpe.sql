-- =====================================================================
-- GUF APP · Competição: pontuação sem esforço (RPE)
--
-- O app não pede mais o esforço da sessão: a medição sai da pontuação e o ajuste automático de
-- RPE (decisão automatizada, LGPD Art. 20) deixa de existir. Pontos da semana (máx. 120), na
-- ordem de prioridade pedida pelo produto:
--   1. Constância: 20 por treino válido, até 60 (3 treinos na semana)
--      + sequência: 5 × semanas cumpridas seguidas (≥ 3 treinos), até 20 — total 80;
--   2. Recordes: 5 por recorde de carga batido na semana, até 25;
--   3. Volume: até 15, proporcional ao volume da semana comparado à média das suas últimas
--      4 semanas com treino (sem histórico, 15 se treinou). Comparar com você mesmo deixa justo
--      para quem levanta menos.
-- Continua valendo: treino válido = ≥ 20 min de tempo efetivo; no máximo 1 por dia (o de maior
-- volume); dia = início do treino no fuso do perfil. Desempate: semanas cumpridas → treinos
-- válidos → volume (montado no app, rankCompetitors).
--
-- A regra vale para todas as temporadas (os pontos não são guardados: são recalculados a cada
-- consulta). Na prática, até aqui ninguém informava esforço, então a parte de esforço era 0.
-- workout_sessions.session_rpe fica no banco (dado antigo, sem uso) até uma limpeza futura.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Parâmetros novos (linhas publicadas recebem o padrão; o gatilho só bloqueia UPDATE/DELETE)
-- ---------------------------------------------------------------------
alter table public.competition_parameters
  add column record_points       numeric  not null default 5,
  add column records_max         numeric  not null default 25,
  add column volume_max          numeric  not null default 15,
  add column volume_window_weeks smallint not null default 4 check (volume_window_weeks > 0);

comment on column public.competition_parameters.effort_max is 'Sem uso desde 2026-10-20 (pontuação sem esforço).';
comment on column public.competition_parameters.reference_load is 'Sem uso desde 2026-10-20 (pontuação sem esforço).';
comment on column public.workout_sessions.session_rpe is
  'Sem uso desde 2026-10-20: o esforço não é mais pedido nem entra na pontuação. Dado antigo, mantido até uma limpeza futura.';

-- ---------------------------------------------------------------------
-- 2. Esforço: fim da coleta e da explicação dos ajustes
-- ---------------------------------------------------------------------
drop function if exists public.set_session_rpe(uuid, smallint);
drop function if exists public.get_my_competition_sessions(date, date);

-- ---------------------------------------------------------------------
-- 3. Cálculo
-- ---------------------------------------------------------------------
drop function if exists public.get_competition_weeks(date, date);
drop function if exists public.competition_week_scores(uuid, date);
drop function if exists public.competition_session_scores(uuid, date, date);

-- Uma linha por treino concluído no período: dia no fuso do perfil (pelo início real, gravado pelo
-- servidor), minutos considerados, volume (Σ carga × reps sem aquecimento), recordes de carga e
-- counted = o treino que vale no dia (no máximo um: o válido de maior volume).
create function public.competition_session_scores(p_user_id uuid, p_from date, p_to date)
returns table (
  session_id          uuid,
  training_day        date,
  week_start          date,
  minutes_considered  numeric,
  is_valid            boolean,
  volume              numeric,
  records             integer,
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
           (s.started_at at time zone z.tz)::date as day,
           coalesce(s.active_seconds, extract(epoch from (s.finished_at - s.started_at)))::numeric / 60 as minutes
      from public.workout_sessions s
      cross join zone z
     where s.user_id = p_user_id and s.status = 'completed'
       and (s.started_at at time zone z.tz)::date between p_from and p_to
  ),
  volumes as (
    select sl.session_id as sid, sum(sl.weight_kg * sl.reps) as volume
      from public.set_logs sl
     where sl.session_id in (select x.sid from sessions x)
       and sl.is_completed and sl.set_type <> 'warmup'
       and sl.weight_kg is not null and sl.reps is not null
     group by sl.session_id
  ),
  records as (
    select r.session_id as sid, r.records from public.session_load_records(p_user_id) r
  ),
  scored as (
    select x.sid, x.day,
           x.day - extract(dow from x.day)::integer as wk,
           x.minutes,
           x.minutes >= cp.min_minutes as valid,
           least(x.minutes, cp.max_minutes) as considered,
           coalesce(v.volume, 0) as volume,
           coalesce(r.records, 0) as records
      from sessions x
      left join volumes v on v.sid = x.sid
      left join records r on r.sid = x.sid
      cross join lateral public.competition_params_for(
        public.competition_season_of(x.day - extract(dow from x.day)::integer)) cp
  )
  select sc.sid, sc.day, sc.wk, round(sc.considered, 1), sc.valid, round(sc.volume, 1), sc.records,
         sc.valid and row_number() over (partition by sc.day order by sc.valid desc, sc.volume desc, sc.sid) = 1
    from scored sc;
$$;

-- Uma linha por semana (domingo) do primeiro treino até a semana de p_to.
-- consecutive_weeks atravessa temporadas (é constância contínua).
create function public.competition_week_scores(p_user_id uuid, p_to date)
returns table (
  week_start         date,
  valid_sessions     integer,
  weekly_volume      numeric,
  records            integer,
  constancy_points   numeric,
  record_points      numeric,
  volume_points      numeric,
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
           coalesce(sum(s.volume), 0) as vol,
           coalesce(sum(s.records), 0)::integer as recs
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
    select w.wk, coalesce(a.n, 0) as n, coalesce(a.vol, 0) as vol, coalesce(a.recs, 0) as recs,
           cp.sessions_for_max_constancy as smax, cp.constancy_max, cp.bonus_per_week, cp.bonus_max,
           cp.record_points, cp.records_max, cp.volume_max, cp.volume_window_weeks
      from weeks w
      left join agg a on a.wk = w.wk
      cross join lateral public.competition_params_for(public.competition_season_of(w.wk)) cp
  ),
  -- Referência do volume: média das últimas N semanas anteriores em que houve volume.
  with_reference as (
    select b.*,
           (select avg(t.vol)
              from (select p.vol, row_number() over (order by p.wk desc) as recency
                      from base p
                     where p.vol > 0 and p.wk < b.wk) t
             where t.recency <= b.volume_window_weeks) as reference_volume
      from base b
  ),
  marked as (
    select r.*,
           r.n >= r.smax as ok,
           count(*) filter (where r.n < r.smax) over (order by r.wk) as grp
      from with_reference r
  ),
  streaked as (
    select m.*,
           (sum(case when m.ok then 1 else 0 end) over (partition by m.grp order by m.wk))::integer as consec
      from marked m
  ),
  pointed as (
    select s.*,
           least(s.n, s.smax) * s.constancy_max / s.smax as constancy,
           least(s.records_max, s.recs * s.record_points) as record_pts,
           case
             when s.vol <= 0 then 0
             when s.reference_volume is null then s.volume_max
             else s.volume_max * least(1, s.vol / s.reference_volume)
           end as volume_pts,
           case when s.ok then least(s.bonus_max, s.bonus_per_week * s.consec) else 0 end as bonus
      from streaked s
  )
  select p.wk, p.n, round(p.vol, 1), p.recs,
         round(p.constancy, 2), round(p.record_pts, 2), round(p.volume_pts, 2), p.bonus,
         round(p.constancy + p.record_pts + p.volume_pts + p.bonus)::integer,
         p.ok, case when p.ok then p.consec else 0 end
    from pointed p;
$$;

-- Pontos por semana de cada participante: semanas que tocam o período (até 400 dias).
create function public.get_competition_weeks(p_from date, p_to date)
returns table (
  user_id           uuid,
  week_start        date,
  points            integer,
  constancy_points  numeric,
  bonus_points      numeric,
  record_points     numeric,
  volume_points     numeric,
  valid_sessions    integer,
  weekly_volume     numeric,
  records           integer,
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
  select pp.uid, w.week_start, w.points, w.constancy_points, w.bonus_points, w.record_points, w.volume_points,
         w.valid_sessions, w.weekly_volume, w.records, w.fulfilled
    from (select v_uid as uid union select c.competitor_id from public.competitors_of(v_uid) c) pp
    cross join lateral public.competition_week_scores(pp.uid, least(p_to, public.local_today(pp.uid))) w
   where w.week_start between p_from - extract(dow from p_from)::integer and p_to
   order by pp.uid, w.week_start;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Permissões (as internas continuam sem acesso pelo app)
-- ---------------------------------------------------------------------
revoke execute on function
  public.competition_session_scores(uuid, date, date),
  public.competition_week_scores(uuid, date)
from public, anon, authenticated;

revoke execute on function public.get_competition_weeks(date, date) from public, anon;
grant execute on function public.get_competition_weeks(date, date) to authenticated;
