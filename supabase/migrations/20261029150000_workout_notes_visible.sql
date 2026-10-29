-- =====================================================================
-- GUF APP · Observações fazem parte do treino (decisão de produto, 2026-10-29)
--
-- Antes: observações (do treino e de cada exercício) eram só do dono. Agora seguem a MESMA
-- visibilidade dos treinos: quem pode ver o histórico (você, seguidor aceito ou qualquer conta logada
-- se o perfil estiver aberto, e o dono não ocultou o histórico; de outra pessoa, só o mês atual)
-- vê também as observações. Ocultar o histórico esconde as observações junto.
--   · list_member_workout_feed: a observação do treino deixa de ser só do dono e cada exercício
--     traz a dele ('note'). Os pontos continuam só para o dono e quem compete com ele.
--   · get_member_workout: o invólucro (permissão + mês atual) acrescenta a observação de cada
--     exercício ('note') ao resultado de get_member_workout_unrestricted, que não muda.
-- Consentimento: as observações já escritas foram feitas com a promessa de que eram só do dono. Por
-- isso as de uma pessoa só aparecem para outras DEPOIS que ela aceitar os Termos 1.3, que descrevem
-- a mudança (workout_notes_shared); antes disso, ou enquanto a versão 1.3 não existir, ficam só com
-- ela. O dono sempre vê as próprias.
-- Continua igual: medidas nunca aparecem para outra pessoa; observações nunca vão para o GUF AI.
-- Termos 1.3 e Política 1.4 descrevem a mudança (migration seguinte, com novo aceite).
-- =====================================================================

-- Observações de p_owner podem aparecer para quem pergunta? O dono sempre; outros, só depois de o dono
-- aceitar a versão dos Termos que tornou as observações parte do treino.
create function public.workout_notes_shared(p_owner uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select p_owner = (select auth.uid())
      or exists (
           select 1
             from public.consent_records c
             join public.legal_documents d on d.id = c.document_id
            where c.user_id = p_owner
              and c.action = 'granted'
              and d.doc_type = 'terms'
              and d.published_at >= (select n.published_at from public.legal_documents n
                                      where n.doc_type = 'terms' and n.version = '1.3')
         );
$$;

revoke execute on function public.workout_notes_shared(uuid) from public, anon, authenticated;

create or replace function public.list_member_workout_feed(p_user_id uuid default null, p_before timestamptz default null, p_limit integer default 10)
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
  v_sees_points boolean;
  v_notes       boolean := public.workout_notes_shared(coalesce(p_user_id, (select auth.uid())));
begin
  v_sees_points := v_owner = v_uid or exists (select 1 from public.competitors_of(v_uid) c where c.competitor_id = v_owner);

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
    select se.session_id, se.position, e.name, e.muscle_group, se.exercise_id, se.notes,
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
     group by se.session_id, se.position, e.name, e.muscle_group, se.exercise_id, se.notes
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
         case when v_notes then s.notes end,
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
                    'is_record', coalesce(r.is_record, false),
                    'note', case when v_notes then r.notes end)
                  order by r.position)
             from with_records r
            where r.session_id = p.session_id
         ), '[]'::jsonb)
    from page p
    join public.workout_sessions s on s.id = p.session_id
   order by p.finished_at desc;
end;
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
  'Treino concluído de outra pessoa (com as observações dos exercícios; sem RPE, projeto ou rotina), conforme can_view_member_history e o mês atual.';

comment on function public.list_member_workout_feed(uuid, timestamptz, integer) is
  'Página do feed de treinos do perfil (card 2a): a de list_member_workouts + exercícios (com observações), edição, observação do treino e pontos (dono e competidores).';
