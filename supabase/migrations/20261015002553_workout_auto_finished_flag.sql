-- =====================================================================
-- GUF APP · Marca o treino encerrado pela finalização automática
--
-- workout_sessions.auto_finished = true quando quem encerrou foi o servidor
-- (auto_finish_idle_workouts). O app usa para avisar "Treino encerrado
-- automaticamente" e descartar alterações feitas depois (ex.: sem internet).
-- A função é recriada igual à anterior, só gravando a marca.
-- =====================================================================

alter table public.workout_sessions
  add column auto_finished boolean not null default false;

comment on column public.workout_sessions.auto_finished is
  'true = encerrado pela finalização automática (30 min após a última série).';

create or replace function public.auto_finish_idle_workouts(p_idle interval default interval '30 minutes')
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_row record;
  v_at timestamptz;
  v_active integer;
  v_periods integer;
  v_count integer := 0;
begin
  for v_row in
    select ws.id, ws.started_at, max(sl.completed_at) as last_done
      from public.workout_sessions ws
      join public.profiles p on p.id = ws.user_id and p.auto_finish_workout
      join public.set_logs sl on sl.session_id = ws.id
     where ws.status = 'in_progress'
     group by ws.id, ws.started_at
    having bool_and(sl.is_completed)
       and max(sl.completed_at) <= now() - p_idle
  loop
    -- Fim = última série concluída (nunca antes do início do treino).
    v_at := greatest(v_row.last_done, v_row.started_at);

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

  return v_count;
end;
$$;

revoke execute on function public.auto_finish_idle_workouts(interval) from public, anon, authenticated;
