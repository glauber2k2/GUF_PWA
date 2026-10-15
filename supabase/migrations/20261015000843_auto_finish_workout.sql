-- =====================================================================
-- GUF APP · Finalizar o treino automaticamente
--
-- Preferência do perfil (desligada por padrão). Com ela ligada, um treino em
-- andamento é finalizado pelo servidor quando:
--   1. tem pelo menos 1 série e TODAS estão concluídas; e
--   2. a última série foi concluída há 30 minutos ou mais (nada mudou desde então:
--      desmarcar/criar série deixa o treino incompleto; remarcar renova o horário).
-- O fim do treino é o horário da ÚLTIMA série concluída (não o da verificação):
-- o tempo depois dela não conta como treino. Roda no servidor (pg_cron, a cada
-- 5 minutos), então funciona com o app fechado.
--
-- Mesmas regras do finish_workout para o que é gravado (exercícios sem séries
-- saem, períodos ativos fecham, active_seconds = soma dos períodos). Os recordes
-- não são gravados em lugar nenhum: o app os calcula ao abrir o resumo.
-- =====================================================================

alter table public.profiles
  add column auto_finish_workout boolean not null default false;

comment on column public.profiles.auto_finish_workout is
  'Finalizar o treino sozinho 30 min depois da última série, quando todas estão concluídas.';

-- ---------------------------------------------------------------------
-- Encerra os treinos ociosos (chamada só pelo agendamento; sem acesso pelo app)
-- ---------------------------------------------------------------------
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
       set status = 'completed', finished_at = v_at, active_seconds = greatest(v_active, 0)
     where id = v_row.id and status = 'in_progress';

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

comment on function public.auto_finish_idle_workouts(interval) is
  'Finaliza treinos de quem ligou auto_finish_workout: todas as séries concluídas e a última há p_idle ou mais.';

revoke execute on function public.auto_finish_idle_workouts(interval) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Agendamento (pg_cron): a cada 5 minutos → finaliza entre 30 e 35 min após a última série
-- ---------------------------------------------------------------------
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'auto-finish-idle-workouts',
  '*/5 * * * *',
  $$select public.auto_finish_idle_workouts()$$
);
