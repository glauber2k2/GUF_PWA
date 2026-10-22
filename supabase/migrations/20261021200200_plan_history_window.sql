-- =====================================================================
-- GUF APP · Histórico e competição devolvidos conforme o plano
--
-- O banco GUARDA tudo (assinar depois mostra o histórico inteiro na hora), mas só DEVOLVE ao app o
-- que o plano libera:
--   - history_months: treinos (e exercícios, séries e períodos deles) a partir do 1º dia do mês mais
--     antigo liberado, no fuso do perfil. Aplicado por RLS (SELECT) nas quatro tabelas do treino: vale
--     para toda consulta do app, para as funções que rodam com os direitos de quem chama
--     (get_training_days, get_exercise_history, get_exercise_records) e para a Edge Function guf-ai.
--     O treino em andamento aparece sempre.
--   - competition_full_history: sem ela, a competição só devolve a temporada atual.
-- Funções SECURITY DEFINER que mostram histórico (perfil, evolução semanal, treino de outra pessoa,
-- competição) ganham um invólucro com o mesmo nome que aplica a janela; a original é renomeada
-- para *_unrestricted e fica sem acesso pelo app.
--
-- Continuam usando o histórico INTEIRO (funcionamento correto, sem devolver treinos antigos):
-- finish_workout e os recordes oficiais, get_streak, pontuação da competição, get_last_performance
-- ("Anterior" no treino), export_my_data (direito de acesso, LGPD art. 18, II) e as funções novas
-- get_best_e1rm (só o número do melhor 1RM, para marcar recordes) e get_training_totals (1º treino,
-- total e última rotina feita, para a Início, o Perfil e os stories).
-- Sem auth.uid() (servidor, jobs) nada é limitado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Início da janela do histórico
-- ---------------------------------------------------------------------
create or replace function public.history_visible_from_of(p_user_id uuid)
returns date
language sql stable security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then '-infinity'::date
    when public.feature_limit_of(p_user_id, 'history_months') is null then '-infinity'::date
    else (date_trunc('month', public.local_today(p_user_id))
          - make_interval(months => greatest(public.feature_limit_of(p_user_id, 'history_months'), 1) - 1))::date
  end;
$$;

revoke execute on function public.history_visible_from_of(uuid) from public, anon, authenticated;

create or replace function public.history_visible_from()
returns date
language sql stable security definer
set search_path = ''
as $$
  select public.history_visible_from_of((select auth.uid()));
$$;

revoke execute on function public.history_visible_from() from public, anon;
grant execute on function public.history_visible_from() to authenticated;

-- Treino visível para quem consulta: em andamento ou dentro da janela do plano.
create or replace function public.is_session_visible(p_session_id uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_sessions ws
     where ws.id = p_session_id
       and (ws.status = 'in_progress' or ws.performed_on >= (select public.history_visible_from()))
  );
$$;

revoke execute on function public.is_session_visible(uuid) from public, anon;
grant execute on function public.is_session_visible(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. RLS: leitura pela janela; gravação como antes
-- As políticas "acesso total" (for all) viram uma por comando. UPDATE e DELETE também passam pela
-- leitura (regra do Postgres): treino fora da janela não é alterado pelo app.
-- ---------------------------------------------------------------------
drop policy "treinos: acesso total aos próprios" on public.workout_sessions;

create policy "treinos: ler os próprios do plano" on public.workout_sessions
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and (status = 'in_progress' or performed_on >= (select public.history_visible_from()))
  );
create policy "treinos: criar os próprios" on public.workout_sessions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (
      select 1 from public.routines r
       where r.id = routine_id and r.user_id = (select auth.uid())))
  );
create policy "treinos: alterar os próprios" on public.workout_sessions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (
      select 1 from public.routines r
       where r.id = routine_id and r.user_id = (select auth.uid())))
  );
create policy "treinos: apagar os próprios" on public.workout_sessions
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy "exercícios do treino: acesso total aos próprios" on public.session_exercises;

create policy "exercícios do treino: ler os próprios do plano" on public.session_exercises
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_session_visible(session_id));
create policy "exercícios do treino: criar os próprios" on public.session_exercises
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.exercises e
       where e.id = exercise_id
         and (e.user_id is null or e.user_id = (select auth.uid())))
  );
create policy "exercícios do treino: alterar os próprios" on public.session_exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.exercises e
       where e.id = exercise_id
         and (e.user_id is null or e.user_id = (select auth.uid())))
  );
create policy "exercícios do treino: apagar os próprios" on public.session_exercises
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy "séries: acesso total às próprias" on public.set_logs;

create policy "séries: ler as próprias do plano" on public.set_logs
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_session_visible(session_id));
create policy "séries: criar as próprias" on public.set_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "séries: alterar as próprias" on public.set_logs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "séries: apagar as próprias" on public.set_logs
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy "períodos do treino: acesso total aos próprios" on public.workout_active_periods;

create policy "períodos do treino: ler os próprios do plano" on public.workout_active_periods
  for select to authenticated
  using (user_id = (select auth.uid()) and public.is_session_visible(session_id));
create policy "períodos do treino: criar os próprios" on public.workout_active_periods
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "períodos do treino: alterar os próprios" on public.workout_active_periods
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "períodos do treino: apagar os próprios" on public.workout_active_periods
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Números que precisam do histórico inteiro, sem devolver os treinos
-- ---------------------------------------------------------------------

-- Melhor 1RM estimado (Epley, 1 casa, igual a get_exercise_history) de cada exercício.
-- p_hidden_only: só dos treinos FORA da janela do plano (base para os recordes do que aparece).
create or replace function public.get_best_e1rm(p_exercise_ids uuid[], p_hidden_only boolean default false)
returns table (exercise_id uuid, best_e1rm_kg numeric)
language sql stable security definer
set search_path = ''
as $$
  select sl.exercise_id,
         round(max(sl.weight_kg * (1 + sl.reps / 30.0)) filter (where sl.reps > 0), 1)
    from public.set_logs sl
    join public.workout_sessions ws on ws.id = sl.session_id
   where sl.user_id = (select auth.uid())
     and sl.exercise_id = any (p_exercise_ids)
     and sl.is_completed
     and sl.set_type <> 'warmup'
     and ws.status = 'completed'
     and (not p_hidden_only or ws.performed_on < (select public.history_visible_from()))
   group by sl.exercise_id;
$$;

revoke execute on function public.get_best_e1rm(uuid[], boolean) from public, anon;
grant execute on function public.get_best_e1rm(uuid[], boolean) to authenticated;

-- 1º treino, total de treinos concluídos (até p_until, se informado) e a última rotina feita.
create or replace function public.get_training_totals(p_until date default null)
returns table (first_trained_on date, completed_sessions integer, last_routine_id uuid, last_routine_on date)
language sql stable security definer
set search_path = ''
as $$
  with mine as (
    select ws.* from public.workout_sessions ws
     where ws.user_id = (select auth.uid()) and ws.status = 'completed'
  ),
  last_routine as (
    select m.routine_id, m.performed_on from mine m
     where m.routine_id is not null
     order by m.performed_on desc, m.finished_at desc
     limit 1
  )
  select (select min(m.performed_on) from mine m),
         (select count(*) from mine m where p_until is null or m.performed_on <= p_until)::integer,
         (select lr.routine_id from last_routine lr),
         (select lr.performed_on from last_routine lr);
$$;

revoke execute on function public.get_training_totals(date) from public, anon;
grant execute on function public.get_training_totals(date) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Invólucros das funções SECURITY DEFINER que devolvem histórico
-- ---------------------------------------------------------------------

-- Início da temporada atual (1º domingo cuja semana termina no mês), no fuso de quem consulta.
create or replace function public.current_season_start_of(p_user_id uuid)
returns date
language sql stable
set search_path = ''
as $$
  with season as (
    select public.competition_season_of(
             public.local_today(p_user_id) - extract(dow from public.local_today(p_user_id))::integer
           ) as first_day
  )
  select (s.first_day + ((6 - extract(dow from s.first_day)::integer) % 7) - 6)
    from season s;
$$;

revoke execute on function public.current_season_start_of(uuid) from public, anon, authenticated;

-- Primeiro dia que a competição devolve para quem consulta (sem limite: o pedido).
create or replace function public.competition_visible_from(p_from date)
returns date
language sql stable security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null or public.has_feature_of((select auth.uid()), 'competition_full_history') then p_from
    else greatest(p_from, public.current_season_start_of((select auth.uid())))
  end;
$$;

revoke execute on function public.competition_visible_from(date) from public, anon, authenticated;

alter function public.get_competition_weeks(date, date) rename to get_competition_weeks_unrestricted;
alter function public.get_competition_days(date, date) rename to get_competition_days_unrestricted;
alter function public.list_member_workouts(uuid, timestamptz, integer) rename to list_member_workouts_unrestricted;
alter function public.get_member_evolution(uuid, integer) rename to get_member_evolution_unrestricted;
alter function public.get_member_workout(uuid) rename to get_member_workout_unrestricted;

revoke execute on function
  public.get_competition_weeks_unrestricted(date, date),
  public.get_competition_days_unrestricted(date, date),
  public.list_member_workouts_unrestricted(uuid, timestamptz, integer),
  public.get_member_evolution_unrestricted(uuid, integer),
  public.get_member_workout_unrestricted(uuid)
  from public, anon, authenticated;

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
language sql stable security definer
set search_path = ''
as $$
  select * from public.get_competition_weeks_unrestricted(public.competition_visible_from(p_from), p_to)
   where public.competition_visible_from(p_from) <= p_to;
$$;

create function public.get_competition_days(p_from date, p_to date)
returns table (user_id uuid, day date, workouts integer, volume_kg numeric, records integer)
language sql stable security definer
set search_path = ''
as $$
  select * from public.get_competition_days_unrestricted(public.competition_visible_from(p_from), p_to)
   where public.competition_visible_from(p_from) <= p_to;
$$;

-- Histórico de outra pessoa (ou o seu) segue o plano de QUEM consulta.
create function public.list_member_workouts(p_user_id uuid default null, p_before timestamptz default null, p_limit integer default 20)
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
language sql stable security definer
set search_path = ''
as $$
  select * from public.list_member_workouts_unrestricted(p_user_id, p_before, p_limit) w
   where w.performed_on >= (select public.history_visible_from());
$$;

create function public.get_member_evolution(p_user_id uuid default null, p_weeks integer default 26)
returns table (week_start date, sessions integer, volume_kg numeric, max_weight_kg numeric, active_seconds integer)
language sql stable security definer
set search_path = ''
as $$
  select * from public.get_member_evolution_unrestricted(p_user_id, p_weeks) e
   where e.week_start + 6 >= (select public.history_visible_from());
$$;

create function public.get_member_workout(p_session_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_result jsonb := public.get_member_workout_unrestricted(p_session_id);
begin
  -- Mesma resposta de "não existe" (GS009), como já acontece sem permissão.
  if (v_result ->> 'performed_on')::date < (select public.history_visible_from()) then
    raise exception 'Treino não encontrado' using errcode = 'GS009';
  end if;
  return v_result;
end;
$$;

revoke execute on function
  public.get_competition_weeks(date, date),
  public.get_competition_days(date, date),
  public.list_member_workouts(uuid, timestamptz, integer),
  public.get_member_evolution(uuid, integer),
  public.get_member_workout(uuid)
  from public, anon;
grant execute on function
  public.get_competition_weeks(date, date),
  public.get_competition_days(date, date),
  public.list_member_workouts(uuid, timestamptz, integer),
  public.get_member_evolution(uuid, integer),
  public.get_member_workout(uuid)
  to authenticated;
