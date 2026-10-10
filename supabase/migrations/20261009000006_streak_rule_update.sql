-- =====================================================================
-- GUF APP · Migration 6 · Nova regra do streak
-- Regra: a semana (segunda a domingo) conta como treinada com PELO MENOS 1 treino.
-- O streak é o número de semanas seguidas treinadas. Uma semana inteira sem
-- nenhum treino zera o streak.
-- A semana atual não zera a sequência enquanto não terminar (o usuário ainda tem tempo).
-- O campo weekly_goal do perfil continua existindo apenas para exibição
-- (ex.: "3 de 4 treinos") e NÃO influencia o streak.
-- =====================================================================

drop function if exists public.get_streak();

create function public.get_streak()
returns table (
  current_streak      integer,   -- semanas seguidas treinadas (inclui a atual, se já treinou nela)
  best_streak         integer,   -- maior sequência da história do usuário
  current_week_count  integer,   -- treinos concluídos na semana atual
  week_secured        boolean,   -- true se a semana atual já está garantida (≥ 1 treino)
  streak_at_risk      boolean    -- true se há sequência ativa e a semana atual ainda não tem treino
)
language sql stable
set search_path = ''
as $$
  with params as (
    select date_trunc('week', (now() at time zone p.timezone))::date as cur_week
      from public.profiles p
     where p.id = (select auth.uid())
  ),
  weeks_done as (
    select date_trunc('week', ws.performed_on)::date as wk, count(*)::integer as n
      from public.workout_sessions ws
     where ws.user_id = (select auth.uid()) and ws.status = 'completed'
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
  -- A semana atual sem treino ainda não quebra a sequência
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

revoke execute on function public.get_streak() from public, anon;
grant execute on function public.get_streak() to authenticated;
