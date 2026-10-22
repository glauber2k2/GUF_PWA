-- =====================================================================
-- GUF APP · Regra revista: histórico completo; o plano limita só os GRÁFICOS; amigo = mês atual
--
-- Decisão de produto (2026-10-21), substitui a janela de plan_history_window:
--   - O próprio histórico de treinos (lista, calendário, resumos, recordes, evolução) é COMPLETO em
--     qualquer plano. As políticas de leitura voltam a ser só "os próprios".
--   - O plano limita só o que os GRÁFICOS mostram: funcionalidade history_months vira chart_months.
--     O gráfico de evolução do seu perfil (get_member_evolution) é cortado aqui; os gráficos do
--     Histórico e da evolução por exercício usam os mesmos números que a lista e os recordes já
--     mostram completos, então o corte deles fica no app.
--   - Histórico de OUTRA pessoa (lista, treino e gráfico do perfil dela): só o mês atual de quem
--     consulta, em qualquer plano.
--   - Competição: sem mudança (sem competition_full_history, só a temporada atual).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Funcionalidade: gráficos (não mais o histórico)
-- ---------------------------------------------------------------------
update public.features
   set code = 'chart_months',
       description = 'Meses que os gráficos mostram, contando o atual (2 = o mês atual e o anterior)'
 where code = 'history_months';

-- ---------------------------------------------------------------------
-- 2. Leitura do próprio histórico: completa de novo
-- ---------------------------------------------------------------------
drop policy "treinos: ler os próprios do plano" on public.workout_sessions;
create policy "treinos: ler os próprios" on public.workout_sessions
  for select to authenticated using (user_id = (select auth.uid()));

drop policy "exercícios do treino: ler os próprios do plano" on public.session_exercises;
create policy "exercícios do treino: ler os próprios" on public.session_exercises
  for select to authenticated using (user_id = (select auth.uid()));

drop policy "séries: ler as próprias do plano" on public.set_logs;
create policy "séries: ler as próprias" on public.set_logs
  for select to authenticated using (user_id = (select auth.uid()));

drop policy "períodos do treino: ler os próprios do plano" on public.workout_active_periods;
create policy "períodos do treino: ler os próprios" on public.workout_active_periods
  for select to authenticated using (user_id = (select auth.uid()));

-- Sem a janela no histórico, estas deixam de ter uso (recordes voltam a ler o histórico visível).
drop function public.is_session_visible(uuid);
drop function public.is_session_hidden_by_plan(uuid);
drop function public.get_best_e1rm(uuid[], boolean);

-- Melhor 1RM estimado de cada exercício (só o número; recorde no treino em andamento).
create or replace function public.get_best_e1rm(p_exercise_ids uuid[])
returns table (exercise_id uuid, best_e1rm_kg numeric)
language sql stable
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
   group by sl.exercise_id;
$$;

revoke execute on function public.get_best_e1rm(uuid[]) from public, anon;
grant execute on function public.get_best_e1rm(uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Janelas: gráficos (pelo plano) e histórico de outra pessoa (mês atual)
-- ---------------------------------------------------------------------
create or replace function public.chart_visible_from_of(p_user_id uuid)
returns date
language sql stable security definer
set search_path = ''
as $$
  select case
    when p_user_id is null then '-infinity'::date
    when public.feature_limit_of(p_user_id, 'chart_months') is null then '-infinity'::date
    else (date_trunc('month', public.local_today(p_user_id))
          - make_interval(months => greatest(public.feature_limit_of(p_user_id, 'chart_months'), 1) - 1))::date
  end;
$$;

revoke execute on function public.chart_visible_from_of(uuid) from public, anon, authenticated;

-- Primeiro dia que os gráficos mostram para quem consulta (o app usa para escolher o período).
create or replace function public.chart_visible_from()
returns date
language sql stable security definer
set search_path = ''
as $$
  select public.chart_visible_from_of((select auth.uid()));
$$;

revoke execute on function public.chart_visible_from() from public, anon;
grant execute on function public.chart_visible_from() to authenticated;

-- Primeiro dia do histórico de `p_owner` que quem consulta vê: o seu inteiro; o de outra pessoa,
-- só o mês atual (no fuso de quem consulta), em qualquer plano.
create or replace function public.member_history_from(p_owner uuid)
returns date
language sql stable security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null or p_owner is null or p_owner = (select auth.uid()) then '-infinity'::date
    else date_trunc('month', public.local_today((select auth.uid())))::date
  end;
$$;

revoke execute on function public.member_history_from(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Invólucros do perfil (mesmo nome, parâmetros e retorno)
-- ---------------------------------------------------------------------
create or replace function public.list_member_workouts(p_user_id uuid default null, p_before timestamptz default null, p_limit integer default 20)
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
   where w.performed_on >= public.member_history_from(p_user_id);
$$;

-- Gráfico semanal do perfil: o seu segue o plano (chart_months); o de outra pessoa, o mês atual.
create or replace function public.get_member_evolution(p_user_id uuid default null, p_weeks integer default 26)
returns table (week_start date, sessions integer, volume_kg numeric, max_weight_kg numeric, active_seconds integer)
language sql stable security definer
set search_path = ''
as $$
  select * from public.get_member_evolution_unrestricted(p_user_id, p_weeks) e
   where e.week_start + 6 >= greatest(public.member_history_from(p_user_id), (select public.chart_visible_from()));
$$;

create or replace function public.get_member_workout(p_session_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_result jsonb := public.get_member_workout_unrestricted(p_session_id);
  v_owner  uuid := (select ws.user_id from public.workout_sessions ws where ws.id = p_session_id);
begin
  -- Fora do mês atual: mesma resposta de "não existe" (GS009), como já acontece sem permissão.
  if (v_result ->> 'performed_on')::date < public.member_history_from(v_owner) then
    raise exception 'Treino não encontrado' using errcode = 'GS009';
  end if;
  return v_result;
end;
$$;

drop function public.history_visible_from();
drop function public.history_visible_from_of(uuid);
