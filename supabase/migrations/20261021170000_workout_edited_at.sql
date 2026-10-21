-- =====================================================================
-- Treino editado: "Editado pela última vez em …"
--
-- 1. workout_sessions.edited_at: hora da última edição salva por save_workout_edit (nulo = nunca
--    editado). O app não grava a coluna direto (gatilho abaixo): só a edição marca, e ninguém
--    apaga a marca.
-- 2. save_workout_edit: mesmo corpo de 20261021150000_edit_completed_workout, agora marcando edited_at.
-- 3. get_member_workout: mesmo corpo de 20261021120000_member_workout_detail, agora com edited_at
--    (quem vê o treino de outra pessoa também sabe que ele foi editado).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Coluna e proteção
-- ---------------------------------------------------------------------
alter table public.workout_sessions
  add column edited_at timestamptz;

comment on column public.workout_sessions.edited_at is
  'Última edição do treino concluído (save_workout_edit). Nulo = nunca editado. O app não grava direto.';

create or replace function public.guard_workout_edited_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.edited_at := null;
  elsif new.edited_at is distinct from old.edited_at then
    raise exception 'A marca de edição do treino não pode ser alterada diretamente' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workout_sessions_edited_at_guard
  before insert or update on public.workout_sessions
  for each row execute function public.guard_workout_edited_at();

revoke execute on function public.guard_workout_edited_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Salvar a edição (marca edited_at)
-- ---------------------------------------------------------------------
create or replace function public.save_workout_edit(
  p_session_id     uuid,
  p_active_seconds integer,
  p_note           text,
  p_exercises      jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_exercise jsonb;
  v_set jsonb;
  v_exercise_ids uuid[] := '{}';
  v_set_ids uuid[] := '{}';
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  perform 1 from public.workout_sessions s
   where s.id = p_session_id and s.user_id = v_uid and s.status = 'completed'
   for update;
  if not found then
    raise exception 'Treino concluído não encontrado' using errcode = 'GW001';
  end if;

  if p_active_seconds is null or p_active_seconds not between 60 and 86400 then
    raise exception 'O tempo do treino vai de 1 minuto a 24 horas' using errcode = '22023';
  end if;
  if jsonb_typeof(p_exercises) is distinct from 'array' then
    raise exception 'Lista de exercícios inválida' using errcode = '22023';
  end if;

  -- Exercícios: só da biblioteca global ou do próprio usuário; um id já usado em outro treino é recusado.
  for v_exercise in select * from jsonb_array_elements(p_exercises) loop
    if jsonb_array_length(coalesce(v_exercise -> 'sets', '[]'::jsonb)) = 0 then
      continue;
    end if;
    if not exists (
      select 1 from public.exercises e
       where e.id = (v_exercise ->> 'exercise_id')::uuid and (e.user_id is null or e.user_id = v_uid)
    ) then
      raise exception 'Exercício não encontrado' using errcode = 'GW003';
    end if;
    if exists (
      select 1 from public.session_exercises se
       where se.id = (v_exercise ->> 'id')::uuid and se.session_id <> p_session_id
    ) then
      raise exception 'Exercício de outro treino' using errcode = '42501';
    end if;
    v_exercise_ids := v_exercise_ids || (v_exercise ->> 'id')::uuid;

    for v_set in select * from jsonb_array_elements(v_exercise -> 'sets') loop
      if exists (
        select 1 from public.set_logs sl
         where sl.id = (v_set ->> 'id')::uuid and sl.session_id <> p_session_id
      ) then
        raise exception 'Série de outro treino' using errcode = '42501';
      end if;
      v_set_ids := v_set_ids || (v_set ->> 'id')::uuid;
    end loop;
  end loop;

  if cardinality(v_set_ids) = 0 then
    raise exception 'O treino precisa de pelo menos uma série concluída' using errcode = 'GW002';
  end if;

  update public.workout_sessions
     set active_seconds = p_active_seconds,
         notes = nullif(btrim(p_note), ''),
         edited_at = now()
   where id = p_session_id;

  delete from public.set_logs
   where session_id = p_session_id and not (id = any (v_set_ids));
  delete from public.session_exercises
   where session_id = p_session_id and not (id = any (v_exercise_ids));

  for v_exercise in select * from jsonb_array_elements(p_exercises) loop
    if not ((v_exercise ->> 'id')::uuid = any (v_exercise_ids)) then
      continue;
    end if;

    insert into public.session_exercises (id, session_id, exercise_id, position, notes)
    values (
      (v_exercise ->> 'id')::uuid,
      p_session_id,
      (v_exercise ->> 'exercise_id')::uuid,
      (v_exercise ->> 'position')::integer,
      nullif(btrim(v_exercise ->> 'note'), '')
    )
    on conflict (id) do update
      set exercise_id = excluded.exercise_id,
          position = excluded.position,
          notes = excluded.notes;

    for v_set in select * from jsonb_array_elements(v_exercise -> 'sets') loop
      insert into public.set_logs (id, session_exercise_id, set_number, set_type, weight_kg, reps, is_completed)
      values (
        (v_set ->> 'id')::uuid,
        (v_exercise ->> 'id')::uuid,
        (v_set ->> 'set_number')::smallint,
        coalesce(v_set ->> 'set_type', 'normal'),
        (v_set ->> 'weight_kg')::numeric,
        (v_set ->> 'reps')::smallint,
        true
      )
      on conflict (id) do update
        set session_exercise_id = excluded.session_exercise_id,
            set_number = excluded.set_number,
            set_type = excluded.set_type,
            weight_kg = excluded.weight_kg,
            reps = excluded.reps,
            is_completed = true;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.save_workout_edit(uuid, integer, text, jsonb) from public, anon;
grant execute on function public.save_workout_edit(uuid, integer, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Treino de outra pessoa (com edited_at)
-- ---------------------------------------------------------------------
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
           'edited_at', v_session.edited_at,
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
