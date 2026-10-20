-- =====================================================================
-- GUF APP · Recorde pessoal medido pelo 1RM estimado
--
-- Antes: recorde = maior carga do exercício. Agora: recorde = maior 1RM estimado (Epley,
-- carga × (1 + reps / 30), arredondado a 1 casa — o mesmo de get_exercise_history e de
-- estimate1RM no packages/core). Subir a carga OU fazer mais repetições com a mesma carga conta.
-- Continua: um recorde por exercício por treino, contra todos os treinos concluídos antes;
-- aquecimento não conta; primeira vez do exercício não gera recorde.
--
-- 1. finish_workout: personal_records passa a ter só pr_type 'best_e1rm', com a série do recorde
--    (weight, reps), o 1RM (value) e o melhor 1RM anterior (previous). O resto não muda.
-- 2. session_load_records: recordes por treino (competição e get_competition_days) pelo 1RM.
-- =====================================================================

create or replace function public.finish_workout(p_session_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_now timestamptz := now();
  v_session public.workout_sessions;
  v_active integer;
  v_periods integer;
  v_summary jsonb;
  v_prs jsonb;
begin
  select * into v_session
    from public.workout_sessions
   where id = p_session_id and user_id = v_uid and status = 'in_progress';

  if not found then
    raise exception 'Treino em andamento não encontrado' using errcode = 'P0002';
  end if;

  delete from public.set_logs
   where session_id = p_session_id and not is_completed;

  delete from public.session_exercises se
   where se.session_id = p_session_id
     and not exists (select 1 from public.set_logs sl where sl.session_exercise_id = se.id);

  -- Encerra o período em andamento no momento da finalização.
  update public.workout_active_periods
     set ended_at = greatest(v_now, started_at)
   where session_id = p_session_id and ended_at is null;

  select coalesce(sum(extract(epoch from (p.ended_at - p.started_at))), 0)::integer, count(*)::integer
    into v_active, v_periods
    from public.workout_active_periods p
   where p.session_id = p_session_id;

  -- Treino sem períodos (não deveria acontecer): usa início → fim.
  if v_periods = 0 then
    v_active := extract(epoch from (v_now - v_session.started_at))::integer;
  end if;

  update public.workout_sessions
     set status = 'completed', finished_at = v_now, active_seconds = greatest(v_active, 0)
   where id = p_session_id
  returning * into v_session;

  -- Recordes pelo 1RM estimado: este treino contra todos os treinos concluídos anteriores.
  with cur_sets as (
    select sl.exercise_id, sl.weight_kg, sl.reps, sl.set_number,
           round(sl.weight_kg * (1 + sl.reps / 30.0), 1) as e1rm
      from public.set_logs sl
     where sl.session_id = p_session_id and sl.set_type <> 'warmup'
       and sl.weight_kg is not null and sl.reps > 0
  ),
  -- Série do recorde: a de maior 1RM (a primeira, em caso de empate, como na tela do treino).
  current_best as (
    select distinct on (c.exercise_id) c.exercise_id, c.e1rm, c.weight_kg, c.reps
      from cur_sets c
     order by c.exercise_id, c.e1rm desc, c.set_number
  ),
  previous_best as (
    select sl.exercise_id,
           max(round(sl.weight_kg * (1 + sl.reps / 30.0), 1)) as e1rm
      from public.set_logs sl
      join public.workout_sessions ws on ws.id = sl.session_id
     where sl.user_id = v_uid
       and sl.is_completed
       and sl.set_type <> 'warmup'
       and sl.weight_kg is not null and sl.reps > 0
       and ws.status = 'completed'
       and ws.id <> p_session_id
       and sl.exercise_id in (select exercise_id from current_best)
     group by sl.exercise_id
  ),
  prs as (
    select c.exercise_id, e.name, 'best_e1rm' as pr_type,
           c.e1rm as value, p.e1rm as previous, c.reps, c.weight_kg as weight
      from current_best c
      join public.exercises e on e.id = c.exercise_id
      join previous_best p on p.exercise_id = c.exercise_id
     where c.e1rm > p.e1rm
  )
  select coalesce(jsonb_agg(to_jsonb(prs)), '[]'::jsonb) into v_prs from prs;
  -- Observação: a primeira vez de um exercício não conta como PR (não há base de comparação).

  select jsonb_build_object(
           'session_id', v_session.id,
           'name', v_session.name,
           'performed_on', v_session.performed_on,
           'duration_seconds', v_session.active_seconds,
           'elapsed_seconds', extract(epoch from (v_session.finished_at - v_session.started_at))::integer,
           'pauses', greatest(v_periods - 1, 0),
           'exercises', (select count(*) from public.session_exercises where session_id = p_session_id),
           'sets', (select count(*) from public.set_logs where session_id = p_session_id and set_type <> 'warmup'),
           'total_volume_kg', (select coalesce(sum(weight_kg * reps), 0)
                                 from public.set_logs
                                where session_id = p_session_id and set_type <> 'warmup'),
           'personal_records', v_prs
         ) into v_summary;

  return v_summary;
end;
$$;

-- Recordes por treino (competição e get_competition_days): 1RM estimado de um exercício maior que o
-- de todos os treinos concluídos antes (mesma regra do finish_workout; primeira vez não conta).
create or replace function public.session_load_records(p_user_id uuid)
returns table (session_id uuid, performed_on date, records integer)
language sql stable
set search_path = ''
as $$
  with per_exercise as (
    select s.id as sid, s.performed_on as day, s.finished_at, sl.exercise_id,
           max(round(sl.weight_kg * (1 + sl.reps / 30.0), 1)) as best
      from public.workout_sessions s
      join public.set_logs sl on sl.session_id = s.id
     where s.user_id = p_user_id and s.status = 'completed'
       and sl.is_completed and sl.set_type <> 'warmup'
       and sl.weight_kg is not null and sl.reps > 0
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

comment on function public.session_load_records(uuid) is
  'Recordes de cada treino concluído pelo 1RM estimado (Epley, 1 casa), contra os treinos concluídos antes.';
