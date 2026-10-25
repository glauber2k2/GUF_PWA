-- =====================================================================
-- GUF APP · Competição: recorde de cardio pontua como o recorde de carga
--
-- Antes: só o recorde de carga (maior 1RM estimado, session_load_records) contava na competição.
-- Agora: o recorde de cardio também conta, com os mesmos pontos (record_points por recorde, até
-- records_max na semana). Mesma regra do app (packages/core/src/cardio-records.ts):
--   - ritmo: menor tempo por km entre as séries de pelo menos 1 km (mostrado como ritmo ou km/h);
--   - distância: a maior distância de uma série;
--   - um recorde por exercício por treino (ritmo OU distância), contra todos os treinos concluídos
--     antes; empate e primeira vez de cada medida não contam; série sem km não entra.
-- Treino SÓ de cardio precisa de pelo menos min_minutes (20) de tempo efetivo para o recorde de
-- cardio contar; em treino com força, conta como o de carga.
--
-- Decisão de produto (2026-10-25): vale já, para todas as semanas (os pontos são recalculados a
-- cada consulta). Nenhum parâmetro novo: competition_parameters não muda.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Recordes de cardio por treino
-- ---------------------------------------------------------------------
create or replace function public.session_cardio_records(p_user_id uuid)
returns table (session_id uuid, performed_on date, records integer)
language sql stable
set search_path = ''
as $$
  with per_exercise as (
    select s.id as sid, s.performed_on as day, s.finished_at, sl.exercise_id,
           min(sl.duration_seconds / sl.distance_km) filter (where sl.distance_km >= 1 and sl.duration_seconds > 0) as best_pace,
           max(sl.distance_km) filter (where sl.distance_km > 0) as best_distance
      from public.workout_sessions s
      join public.set_logs sl on sl.session_id = s.id
      join public.exercises e on e.id = sl.exercise_id
     where s.user_id = p_user_id and s.status = 'completed'
       and sl.is_completed and sl.set_type <> 'warmup'
       and e.muscle_group = 'cardio' and sl.distance_km is not null
     group by s.id, s.performed_on, s.finished_at, sl.exercise_id
  ),
  compared as (
    select pe.*,
           min(pe.best_pace) over earlier as previous_pace,
           max(pe.best_distance) over earlier as previous_distance
      from per_exercise pe
    window earlier as (partition by pe.exercise_id order by pe.finished_at, pe.sid
                       rows between unbounded preceding and 1 preceding)
  )
  select c.sid, c.day,
         (count(*) filter (where (c.previous_pace is not null and c.best_pace < c.previous_pace)
                              or (c.previous_distance is not null and c.best_distance > c.previous_distance)))::integer
    from compared c
   group by c.sid, c.day;
$$;

comment on function public.session_cardio_records(uuid) is
  'Recordes de cardio de cada treino concluído (ritmo em séries de 1 km ou mais, ou distância), contra os treinos concluídos antes.';

-- ---------------------------------------------------------------------
-- 2. Recordes que a competição conta: carga + cardio elegível
-- ---------------------------------------------------------------------
create or replace function public.session_competition_records(p_user_id uuid)
returns table (session_id uuid, performed_on date, records integer)
language sql stable
set search_path = ''
as $$
  with eligible_cardio as (
    select c.session_id, c.performed_on, c.records
      from public.session_cardio_records(p_user_id) c
      join public.workout_sessions s on s.id = c.session_id
     cross join lateral public.competition_params_for(
       public.competition_season_of(c.performed_on - extract(dow from c.performed_on)::integer)) cp
     where c.records > 0
       and (
         -- Treino com força: o recorde de cardio conta como o de carga.
         exists (
           select 1
             from public.set_logs sl
             join public.exercises e on e.id = sl.exercise_id
            where sl.session_id = s.id and sl.is_completed and sl.set_type <> 'warmup'
              and e.muscle_group <> 'cardio'
         )
         -- Treino só de cardio: precisa do tempo mínimo de um treino válido (mesma conta da competição).
         or least(
              coalesce(s.active_seconds, extract(epoch from (s.finished_at - s.started_at))),
              coalesce(s.measured_active_seconds, s.active_seconds, extract(epoch from (s.finished_at - s.started_at)))
            )::numeric / 60 >= cp.min_minutes
       )
  ),
  all_records as (
    select l.session_id, l.performed_on, l.records from public.session_load_records(p_user_id) l
    union all
    select e.session_id, e.performed_on, e.records from eligible_cardio e
  )
  select a.session_id, a.performed_on, sum(a.records)::integer
    from all_records a
   group by a.session_id, a.performed_on;
$$;

comment on function public.session_competition_records(uuid) is
  'Recordes que a competição conta por treino: carga (1RM) + cardio (treino só de cardio precisa do tempo mínimo).';

revoke execute on function
  public.session_cardio_records(uuid),
  public.session_competition_records(uuid)
from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Pontos por treino (igual à versão de 20261021150000, com os recordes novos)
-- ---------------------------------------------------------------------
create or replace function public.competition_session_scores(p_user_id uuid, p_from date, p_to date)
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
           least(
             coalesce(s.active_seconds, extract(epoch from (s.finished_at - s.started_at))),
             coalesce(s.measured_active_seconds, s.active_seconds, extract(epoch from (s.finished_at - s.started_at)))
           )::numeric / 60 as minutes
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
    select r.session_id as sid, r.records from public.session_competition_records(p_user_id) r
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

-- ---------------------------------------------------------------------
-- 4. Treinos, volume e recordes por dia (métrica "Recordes" do ranking), com os recordes novos
-- ---------------------------------------------------------------------
create or replace function public.get_competition_days_unrestricted(p_from date, p_to date)
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
      cross join lateral public.session_competition_records(pp.uid) r
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
