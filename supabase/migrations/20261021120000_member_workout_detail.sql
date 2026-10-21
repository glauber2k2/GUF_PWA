-- =====================================================================
-- GUF APP · Detalhe do treino de outra pessoa (perfil social)
--
-- get_member_workout(p_session_id): o mesmo conteúdo da tela de resumo de um treino concluído,
-- para quem pode ver os registros de treino do titular (can_view_member_history: o próprio,
-- seguidor aceito ou perfil aberto, e o titular não ocultou o histórico).
-- Nunca entrega observações, RPE, projeto ou rotina (dados de planejamento são só do titular).
-- Recordes pela regra do resumo (maior 1RM estimado contra os treinos concluídos antes: dias
-- anteriores e, no mesmo dia, os que terminaram antes); primeira vez não gera recorde.
-- Erros: GS009 = treino inexistente, em andamento ou de quem você não pode ver (mesma resposta
-- de propósito, como GS004); GS006 = histórico oculto.
-- =====================================================================

create or replace function public.get_member_workout(p_session_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_session public.workout_sessions;
  v_result  jsonb;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  select * into v_session
    from public.workout_sessions s
   where s.id = p_session_id and s.status = 'completed';

  if not found or not public.can_view_member(v_uid, v_session.user_id) then
    raise exception 'Treino não encontrado' using errcode = 'GS009';
  end if;
  if not public.can_view_member_history(v_uid, v_session.user_id) then
    raise exception 'Esta pessoa ocultou o histórico de treinos' using errcode = 'GS006';
  end if;

  with done as (
    select sl.session_exercise_id, sl.exercise_id, sl.set_number, sl.set_type, sl.weight_kg, sl.reps
      from public.set_logs sl
     where sl.session_id = p_session_id and sl.is_completed
  ),
  current_best as (
    select d.exercise_id, max(round(d.weight_kg * (1 + d.reps / 30.0), 1)) as e1rm
      from done d
     where d.set_type <> 'warmup' and d.weight_kg is not null and d.reps > 0
     group by d.exercise_id
  ),
  -- Melhor 1RM antes deste treino; no empate, o dia mais recente (como previousBest1Rm no core).
  previous_best as (
    select distinct on (sl.exercise_id)
           sl.exercise_id, round(sl.weight_kg * (1 + sl.reps / 30.0), 1) as e1rm, ws.performed_on
      from public.set_logs sl
      join public.workout_sessions ws on ws.id = sl.session_id
     where ws.user_id = v_session.user_id
       and ws.status = 'completed'
       and (ws.performed_on < v_session.performed_on
            or (ws.performed_on = v_session.performed_on
                and (ws.finished_at, ws.id) < (v_session.finished_at, v_session.id)))
       and sl.is_completed and sl.set_type <> 'warmup'
       and sl.weight_kg is not null and sl.reps > 0
       and sl.exercise_id in (select cb.exercise_id from current_best cb)
     order by sl.exercise_id, 2 desc, ws.performed_on desc
  ),
  exercises as (
    select se.id, se.exercise_id, se.position, e.name, e.muscle_group,
           case when cb.e1rm > pb.e1rm then cb.e1rm end as record_e1rm,
           pb.e1rm as previous_e1rm,
           pb.performed_on as previous_on
      from public.session_exercises se
      join public.exercises e on e.id = se.exercise_id
      left join current_best cb on cb.exercise_id = se.exercise_id
      left join previous_best pb on pb.exercise_id = se.exercise_id
     where se.session_id = p_session_id
       and exists (select 1 from done d where d.session_exercise_id = se.id)
  )
  select jsonb_build_object(
           'session_id', v_session.id,
           'workout_name', v_session.name,
           'performed_on', v_session.performed_on,
           'started_at', v_session.started_at,
           'finished_at', v_session.finished_at,
           'active_seconds', v_session.active_seconds,
           'period_count', (select count(*) from public.workout_active_periods p where p.session_id = v_session.id),
           'owner', (select jsonb_build_object('user_id', sp.user_id, 'handle', sp.handle, 'name', pr.name, 'avatar_url', pr.avatar_url)
                       from public.social_profiles sp
                       left join public.profiles pr on pr.id = sp.user_id
                      where sp.user_id = v_session.user_id),
           'day_session_ids', (select coalesce(jsonb_agg(ws.id order by ws.finished_at, ws.id), '[]'::jsonb)
                                 from public.workout_sessions ws
                                where ws.user_id = v_session.user_id
                                  and ws.status = 'completed'
                                  and ws.performed_on = v_session.performed_on),
           'exercises', (select coalesce(jsonb_agg(jsonb_build_object(
                                   'id', x.id,
                                   'exercise_id', x.exercise_id,
                                   'name', x.name,
                                   'muscle_group', x.muscle_group,
                                   'record_e1rm', x.record_e1rm,
                                   'previous_e1rm', x.previous_e1rm,
                                   'previous_on', x.previous_on,
                                   'sets', (select jsonb_agg(jsonb_build_object(
                                                     'set_number', d.set_number, 'set_type', d.set_type,
                                                     'weight_kg', d.weight_kg, 'reps', d.reps) order by d.set_number)
                                              from done d where d.session_exercise_id = x.id)
                                 ) order by x.position), '[]'::jsonb)
                           from exercises x)
         ) into v_result;

  return v_result;
end;
$$;

comment on function public.get_member_workout(uuid) is
  'Resumo de um treino concluído de outra pessoa (sem observações, RPE, projeto ou rotina), conforme can_view_member_history.';

revoke execute on function public.get_member_workout(uuid) from public, anon;
grant execute on function public.get_member_workout(uuid) to authenticated;
