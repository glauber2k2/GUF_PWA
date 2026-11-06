-- =====================================================================
-- GUF APP · Finalização automática que funciona com séries em aberto
--
-- Antes: o treino só era encerrado se TODAS as séries estivessem concluídas.
-- Treino iniciado por rotina já nasce com as séries planejadas em aberto, então
-- uma única série não marcada (ou nenhuma) deixava o treino aberto para sempre.
--
-- Agora (só para quem ligou profiles.auto_finish_workout):
--  1. Com ≥ 1 série concluída: 30 min (p_idle) depois da última série concluída,
--     o treino é finalizado nesse horário. Séries em aberto e exercícios que
--     ficaram sem série saem, como no finish_workout.
--  2. Sem nenhuma série concluída: nada a guardar no histórico. Depois de
--     3 horas sem atividade (início ou última retomada), o treino é descartado
--     (o app avisa "Treino encerrado" ao ver que ele sumiu).
-- Mesma assinatura: o job pg_cron `auto-finish-idle-workouts` não muda.
-- =====================================================================

create or replace function public.auto_finish_idle_workouts(p_idle interval default interval '30 minutes')
returns integer
language plpgsql
set search_path = ''
as $$
declare
  -- Treino sem nenhuma série concluída é descartado depois deste tempo parado.
  v_empty_idle constant interval := interval '3 hours';
  v_row record;
  v_at timestamptz;
  v_active integer;
  v_periods integer;
  v_count integer := 0;
begin
  -- 1. Treinos com série concluída: encerra na última série concluída.
  for v_row in
    select ws.id, ws.started_at, max(sl.completed_at) as last_done
      from public.workout_sessions ws
      join public.profiles p on p.id = ws.user_id and p.auto_finish_workout
      join public.set_logs sl on sl.session_id = ws.id and sl.is_completed
     where ws.status = 'in_progress'
     group by ws.id, ws.started_at
    having max(sl.completed_at) <= now() - p_idle
  loop
    v_at := greatest(v_row.last_done, v_row.started_at);

    delete from public.set_logs where session_id = v_row.id and not is_completed;
    delete from public.session_exercises se
     where se.session_id = v_row.id
       and not exists (select 1 from public.set_logs sl where sl.session_exercise_id = se.id);

    -- Períodos ativos cortados no fim: o que começou depois some; o que passou dele fecha nele.
    delete from public.workout_active_periods
     where session_id = v_row.id and started_at >= v_at;
    update public.workout_active_periods
       set ended_at = v_at
     where session_id = v_row.id and (ended_at is null or ended_at > v_at);

    select coalesce(sum(extract(epoch from (p.ended_at - p.started_at))), 0)::integer, count(*)::integer
      into v_active, v_periods
      from public.workout_active_periods p
     where p.session_id = v_row.id;

    if v_periods = 0 then
      v_active := extract(epoch from (v_at - v_row.started_at))::integer;
    end if;

    update public.workout_sessions
       set status = 'completed', finished_at = v_at, active_seconds = greatest(v_active, 0), auto_finished = true
     where id = v_row.id and status = 'in_progress';

    v_count := v_count + 1;
  end loop;

  -- 2. Treinos sem nenhuma série concluída: descartados depois de horas parados.
  with stale as (
    select ws.id
      from public.workout_sessions ws
      join public.profiles p on p.id = ws.user_id and p.auto_finish_workout
     where ws.status = 'in_progress'
       and not exists (select 1 from public.set_logs sl where sl.session_id = ws.id and sl.is_completed)
       and greatest(
             ws.started_at,
             coalesce((select max(ap.started_at) from public.workout_active_periods ap where ap.session_id = ws.id), ws.started_at)
           ) <= now() - v_empty_idle
  ), removed as (
    delete from public.workout_sessions ws using stale where ws.id = stale.id returning ws.id
  )
  select v_count + count(*)::integer into v_count from removed;

  return v_count;
end;
$$;

revoke execute on function public.auto_finish_idle_workouts(interval) from public, anon, authenticated;

comment on function public.auto_finish_idle_workouts(interval) is
  'pg_cron (a cada 5 min), só para quem ligou auto_finish_workout: finaliza na última série concluída depois de p_idle (séries em aberto saem); sem série concluída, descarta depois de 3 h parado.';
