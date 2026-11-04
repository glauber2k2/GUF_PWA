-- =====================================================================
-- GUF APP · Perfil de outra pessoa: treinos completos, gráfico continua no mês atual
--
-- Antes (20261021200400_charts_window_and_member_month): no perfil de outra pessoa, a lista de
-- treinos, o treino aberto e o gráfico mostravam só o mês atual. Agora a lista (e o feed, que a
-- reaproveita) e o treino aberto mostram todo o histórico que a pessoa deixa ver; só o GRÁFICO
-- (get_member_evolution) continua com o mês atual. A paginação não muda (10 por página no feed).
--
-- Quem pode ver não muda: can_view_member_history (perfil aberto ou seguidor aceito; histórico
-- oculto esconde) continua dentro das funções *_unrestricted.
-- Termos de Uso 1.4 descrevem a regra nova (20261104120100_legal_docs_member_history).
-- =====================================================================

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
  select * from public.list_member_workouts_unrestricted(p_user_id, p_before, p_limit);
$$;

comment on function public.list_member_workouts(uuid, timestamptz, integer) is
  'Treinos concluídos do perfil (paginados pelo fim), todo o histórico que can_view_member_history permite.';

create or replace function public.get_member_workout(p_session_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_result jsonb := public.get_member_workout_unrestricted(p_session_id);
  v_owner  uuid := (select ws.user_id from public.workout_sessions ws where ws.id = p_session_id);
begin
  if not public.workout_notes_shared(v_owner) then
    return v_result;
  end if;
  return jsonb_set(v_result, '{exercises}', (
    select coalesce(jsonb_agg(x.value || jsonb_build_object('note', se.notes) order by x.ordinality), '[]'::jsonb)
      from jsonb_array_elements(v_result -> 'exercises') with ordinality as x(value, ordinality)
      left join public.session_exercises se on se.id = (x.value ->> 'id')::uuid
  ));
end;
$$;

comment on function public.get_member_workout(uuid) is
  'Treino concluído de outra pessoa (com as observações dos exercícios; sem RPE, projeto ou rotina), conforme can_view_member_history.';
