-- =====================================================================
-- GUF APP · Tempo médio da rotina como campo calculado tipado
--
-- O gerador de tipos (supabase gen types) só inclui o campo calculado no Row
-- de routines quando o parâmetro da função NÃO tem nome. Recria a função da
-- migration anterior com o parâmetro sem nome ($1). Mesma regra: média da
-- duração efetiva dos últimos 5 treinos concluídos da rotina; null sem treinos.
-- (Função nova, ainda sem uso no app: recriar não afeta nada.)
-- =====================================================================

drop function if exists public.average_duration_seconds(public.routines);

create function public.average_duration_seconds(public.routines)
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
    where s.routine_id = $1.id
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
