-- =====================================================================
-- GUF APP · Perfil: cards do feed de treinos (Claude Design "Cards Feed de Treino" · 2a)
--
-- list_member_workout_feed devolve a mesma página de list_member_workouts (mesma permissão: perfil
-- desbloqueado, histórico não oculto; de outra pessoa, só o mês atual; 10 por vez no app, até 50)
-- com o que o card mostra, numa chamada só por página:
--   · exercises ... por exercício (na ordem do treino): nome, grupo, séries concluídas, a melhor série
--                   (força: maior 1RM estimado; cardio: maior distância) e se ela foi recorde;
--   · edited_at ... marca de edição (todo treino editado mostra, como no resumo);
--   · note ........ observação do treino, SÓ para o dono (observações nunca aparecem para outra pessoa);
--   · points ...... pontos do treino na competição, SÓ para o dono e para quem compete com ele
--                   (seguimento mútuo): constância do dia (se o treino contou) + recordes × pontos
--                   por recorde, pela regra vigente na temporada. Sequência e volume são da semana e
--                   não entram no treino. Visitante recebe null.
-- Recorde de força do exercício: a melhor série do treino passa o melhor 1RM de todos os treinos
-- concluídos ANTES dele (primeira vez não é recorde), a mesma regra do finish_workout.
-- =====================================================================

create function public.list_member_workout_feed(p_user_id uuid default null, p_before timestamptz default null, p_limit integer default 10)
returns table (
  session_id        uuid,
  performed_on      date,
  finished_at       timestamptz,
  name              text,
  duration_seconds  integer,
  sets              integer,
  volume_kg         numeric,
  records           integer,
  edited_at         timestamptz,
  note              text,
  points            integer,
  exercises         jsonb
)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid         uuid := (select auth.uid());
  v_owner       uuid := coalesce(p_user_id, (select auth.uid()));
  v_is_self     boolean;
  v_sees_points boolean;
begin
  v_is_self := v_owner = v_uid;
  v_sees_points := v_is_self or exists (select 1 from public.competitors_of(v_uid) c where c.competitor_id = v_owner);

  return query
  with page as (
    -- Permissão, histórico oculto e janela do mês ficam na função que já existe.
    select * from public.list_member_workouts(p_user_id, p_before, p_limit)
  ),
  scores as (
    select sc.session_id, sc.counted, sc.records, sc.week_start
      from public.competition_session_scores(
             v_owner,
             (select min(p.performed_on) - 1 from page p),
             (select max(p.performed_on) + 1 from page p)) sc
     where v_sees_points and exists (select 1 from page)
  ),
  per_exercise as (
    select se.session_id, se.position, e.name, e.muscle_group, se.exercise_id,
           count(*) as set_count,
           (array_agg(sl.weight_kg order by sl.weight_kg * (1 + sl.reps / 30.0) desc nulls last))[1] as best_weight_kg,
           (array_agg(sl.reps order by sl.weight_kg * (1 + sl.reps / 30.0) desc nulls last))[1] as best_reps,
           max(round(sl.weight_kg * (1 + sl.reps / 30.0), 1)) filter (where sl.weight_kg is not null and sl.reps > 0) as best_e1rm,
           (array_agg(sl.distance_km order by sl.distance_km desc nulls last))[1] as best_distance_km,
           (array_agg(sl.duration_seconds order by sl.distance_km desc nulls last, sl.duration_seconds desc nulls last))[1] as best_duration_seconds
      from public.session_exercises se
      join public.exercises e on e.id = se.exercise_id
      join public.set_logs sl on sl.session_exercise_id = se.id
     where se.session_id in (select p.session_id from page p)
       and sl.is_completed and sl.set_type <> 'warmup'
     group by se.session_id, se.position, e.name, e.muscle_group, se.exercise_id
  ),
  with_records as (
    select x.*,
           x.best_e1rm is not null and x.best_e1rm > (
             select max(round(sl.weight_kg * (1 + sl.reps / 30.0), 1))
               from public.set_logs sl
               join public.workout_sessions s on s.id = sl.session_id
              where s.user_id = v_owner and s.status = 'completed'
                and s.finished_at < (select p.finished_at from page p where p.session_id = x.session_id)
                and sl.exercise_id = x.exercise_id
                and sl.is_completed and sl.set_type <> 'warmup'
                and sl.weight_kg is not null and sl.reps > 0
           ) as is_record
      from per_exercise x
  )
  select p.session_id, p.performed_on, p.finished_at, p.name, p.duration_seconds, p.sets, p.volume_kg, p.records,
         s.edited_at,
         case when v_is_self then s.notes end,
         case when v_sees_points then (
           select (case when sc.counted then cp.constancy_points_per_day else 0 end + sc.records * cp.record_points)::integer
             from scores sc
            cross join lateral public.competition_params_for(public.competition_season_of(sc.week_start)) cp
            where sc.session_id = p.session_id
         ) end,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'name', r.name,
                    'muscle_group', r.muscle_group,
                    'sets', r.set_count,
                    'best_weight_kg', r.best_weight_kg,
                    'best_reps', r.best_reps,
                    'best_distance_km', r.best_distance_km,
                    'best_duration_seconds', r.best_duration_seconds,
                    'is_record', coalesce(r.is_record, false))
                  order by r.position)
             from with_records r
            where r.session_id = p.session_id
         ), '[]'::jsonb)
    from page p
    join public.workout_sessions s on s.id = p.session_id
   order by p.finished_at desc;
end;
$$;

comment on function public.list_member_workout_feed(uuid, timestamptz, integer) is
  'Página do feed de treinos do perfil (card 2a): a de list_member_workouts + exercícios, edição, observação (só o dono) e pontos (dono e competidores).';

revoke execute on function public.list_member_workout_feed(uuid, timestamptz, integer) from public, anon;
grant execute on function public.list_member_workout_feed(uuid, timestamptz, integer) to authenticated;
