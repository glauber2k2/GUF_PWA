-- =====================================================================
-- GUF APP · Competição: extrato de pontos (só os seus)
--
-- get_my_points_statement(de, até): de onde veio cada ponto de quem pergunta — as semanas com as
-- partes (constância, sequência, recordes, volume; as mesmas de get_competition_weeks, inclusive o
-- limite do plano: sem competition_full_history, só a temporada atual) e os treinos do período
-- (nome, dia, minutos, se valeu, se foi o que contou no dia, volume e recordes). Nunca dados de outra
-- pessoa: o extrato é só de auth.uid(). O app monta a distribuição por treino (packages/core).
-- =====================================================================

create or replace function public.get_my_points_statement(p_from date, p_to date)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_from date;
  v_to   date;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'Período inválido' using errcode = '22023';
  end if;
  v_from := public.competition_visible_from(p_from);
  v_to := least(p_to, public.local_today(v_uid));

  return jsonb_build_object(
    'visible_from', v_from,
    'weeks', coalesce((
      select jsonb_agg(jsonb_build_object(
               'week_start', w.week_start,
               'points', w.points,
               'constancy_points', w.constancy_points,
               'bonus_points', w.bonus_points,
               'record_points', w.record_points,
               'volume_points', w.volume_points,
               'valid_sessions', w.valid_sessions,
               'weekly_volume', w.weekly_volume,
               'records', w.records,
               'fulfilled', w.fulfilled
             ) order by w.week_start)
        from public.get_competition_weeks(p_from, p_to) w
       where w.user_id = v_uid), '[]'),
    'sessions', coalesce((
      select jsonb_agg(jsonb_build_object(
               'session_id', s.session_id,
               'name', ws.name,
               'day', s.training_day,
               'week_start', s.week_start,
               'started_at', ws.started_at,
               'minutes', s.minutes_considered,
               'is_valid', s.is_valid,
               'counted', s.counted,
               'volume', s.volume,
               'records', s.records
             ) order by s.training_day, ws.started_at)
        from public.competition_session_scores(v_uid, v_from - extract(dow from v_from)::integer, v_to) s
        join public.workout_sessions ws on ws.id = s.session_id
       where v_from <= v_to), '[]')
  );
end;
$$;

revoke execute on function public.get_my_points_statement(date, date) from public, anon;
grant execute on function public.get_my_points_statement(date, date) to authenticated;
