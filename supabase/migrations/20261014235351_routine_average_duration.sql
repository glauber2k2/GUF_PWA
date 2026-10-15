-- =====================================================================
-- GUF APP · Tempo médio da rotina
--
-- Média da duração dos últimos treinos CONCLUÍDOS com a rotina: no máximo 5
-- (com 1 treino, média de 1; com 3, média dos 3). Duração = tempo efetivo
-- (active_seconds) ou fim − início para treinos antigos sem o campo — a mesma
-- regra da duração exibida no app. Sem treinos concluídos → null (o app mostra
-- a estimativa pelo plano).
--
-- É um "campo calculado" do PostgREST: recebe a linha de routines e pode ser
-- pedido no select como uma coluna (routines(id, name, average_duration_seconds)).
-- security invoker (padrão): o RLS de workout_sessions continua valendo.
-- =====================================================================

-- Últimos treinos concluídos de uma rotina (consulta abaixo).
create index workout_sessions_routine_finished_idx
  on public.workout_sessions (routine_id, finished_at desc)
  where status = 'completed';

create or replace function public.average_duration_seconds(r public.routines)
returns integer
language sql
stable
set search_path = ''
as $$
  select round(avg(recent.seconds))::integer
  from (
    select coalesce(
             s.active_seconds,
             greatest(0, extract(epoch from (s.finished_at - s.started_at)))
           ) as seconds
    from public.workout_sessions s
    where s.routine_id = r.id
      and s.status = 'completed'
      and s.finished_at is not null
    order by s.finished_at desc
    limit 5
  ) recent;
$$;

comment on function public.average_duration_seconds(public.routines) is
  'Média (s) da duração efetiva dos últimos 5 treinos concluídos da rotina; null sem treinos.';

revoke execute on function public.average_duration_seconds(public.routines) from public, anon;
grant execute on function public.average_duration_seconds(public.routines) to authenticated;
