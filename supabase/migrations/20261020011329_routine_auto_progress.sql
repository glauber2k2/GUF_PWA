-- =====================================================================
-- GUF APP · Rotina: carga e repetições automáticas + atualizar a rotina pelo treino
--
-- 1. routines.auto_progress (padrão true, o comportamento de antes): ao iniciar o treino, as séries
--    vêm preenchidas com carga e repetições do último desempenho. Desligado: vêm com o que a pessoa
--    definiu na rotina (routine_exercises.target_weight_kg e o mínimo de target_reps) ou vazias.
-- 2. routine_exercises.target_weight_kg: carga planejada (kg), opcional.
-- 3. save_routine ganha p_auto_progress e lê target_weight_kg dos exercícios. Compatível com o app
--    antigo: sem p_auto_progress, a opção da rotina não muda; exercício sem a chave
--    "target_weight_kg" mantém a carga já salva.
-- 4. update_routine_from_workout(p_session_id): ao finalizar um treino iniciado por rotina, a pessoa
--    pode fazer os exercícios e séries do treino virarem os da rotina (só séries concluídas).
-- =====================================================================

alter table public.routines
  add column auto_progress boolean not null default true;

comment on column public.routines.auto_progress is
  'Preencher as séries do próximo treino com carga e repetições do último desempenho (true) ou com o planejado na rotina (false).';

alter table public.routine_exercises
  add column target_weight_kg numeric(6,2) check (target_weight_kg is null or target_weight_kg between 0 and 1000);

comment on column public.routine_exercises.target_weight_kg is
  'Carga planejada em kg (opcional). Usada ao iniciar o treino quando a rotina não atualiza automaticamente.';

-- ---------------------------------------------------------------------
-- save_routine com a opção e a carga planejada
-- ---------------------------------------------------------------------
drop function public.save_routine(uuid, uuid, text, smallint[], jsonb);

create function public.save_routine(
  p_routine_id uuid,
  p_project_id uuid,
  p_name text,
  p_weekdays smallint[],
  p_exercises jsonb,
  p_auto_progress boolean default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_id      uuid := p_routine_id;
  v_project uuid;
  v_next    integer;
begin
  if not exists (
    select 1 from public.projects
     where id = p_project_id and user_id = v_uid and archived_at is null
  ) then
    raise exception 'Projeto não encontrado ou arquivado' using errcode = 'GP001';
  end if;

  if jsonb_typeof(p_exercises) is distinct from 'array' or jsonb_array_length(p_exercises) = 0 then
    raise exception 'Adicione pelo menos 1 exercício à rotina' using errcode = 'GP003';
  end if;

  select coalesce(max(position), 0) + 1 into v_next from public.routines where project_id = p_project_id;

  if v_id is null then
    insert into public.routines (user_id, project_id, name, weekdays, position, auto_progress)
    values (v_uid, p_project_id, trim(p_name), coalesce(p_weekdays, '{}'), v_next, coalesce(p_auto_progress, true))
    returning id into v_id;
  else
    select project_id into v_project
      from public.routines
     where id = v_id and user_id = v_uid and archived_at is null
       for update;
    if not found then
      raise exception 'Rotina não encontrada ou arquivada' using errcode = 'GP004';
    end if;

    update public.routines
       set name = trim(p_name),
           weekdays = coalesce(p_weekdays, '{}'),
           project_id = p_project_id,
           -- Mudou de projeto: entra no fim da lista do projeto novo.
           position = case when v_project is distinct from p_project_id then v_next else position end,
           auto_progress = coalesce(p_auto_progress, auto_progress)
     where id = v_id;
  end if;

  delete from public.routine_exercises re
   where re.routine_id = v_id
     and re.id <> all (array(select (e ->> 'id')::uuid from jsonb_array_elements(p_exercises) as e));

  -- user_id vem do gatilho fill_from_routine; position segue a ordem recebida.
  insert into public.routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, target_weight_kg, rest_seconds, notes)
  select (e.value ->> 'id')::uuid,
         v_id,
         (e.value ->> 'exercise_id')::uuid,
         e.ordinality::integer,
         (e.value ->> 'target_sets')::smallint,
         nullif(trim(e.value ->> 'target_reps'), ''),
         (e.value ->> 'target_weight_kg')::numeric,
         (e.value ->> 'rest_seconds')::smallint,
         nullif(trim(e.value ->> 'notes'), '')
    from jsonb_array_elements(p_exercises) with ordinality as e(value, ordinality)
  on conflict (id) do update
     set exercise_id      = excluded.exercise_id,
         position         = excluded.position,
         target_sets      = excluded.target_sets,
         target_reps      = excluded.target_reps,
         -- App antigo não manda a chave: mantém a carga já salva (position = índice + 1 no JSON).
         target_weight_kg = case when (p_exercises -> (excluded.position - 1)) ? 'target_weight_kg'
                                 then excluded.target_weight_kg
                                 else public.routine_exercises.target_weight_kg end,
         rest_seconds     = excluded.rest_seconds,
         notes            = excluded.notes
   where public.routine_exercises.routine_id = v_id;

  return v_id;
end;
$$;

comment on function public.save_routine(uuid, uuid, text, smallint[], jsonb, boolean) is
  'Cria ou atualiza a rotina (nome, projeto, dias, carga automática) e seus exercícios planejados numa transação. Erros: GP001, GP003, GP004.';

-- ---------------------------------------------------------------------
-- Atualizar a rotina com o treino finalizado
-- ---------------------------------------------------------------------
-- Exercícios na ordem do treino; séries = séries concluídas sem aquecimento (só aquecimento: todas);
-- repetições = "10" ou "8-12" (menor e maior das séries); carga = a maior (sem aquecimento).
-- Descanso e observação da rotina são mantidos para os exercícios que já estavam nela (observação
-- do treino, se houver, tem prioridade); exercício novo entra com 90 s.
create or replace function public.update_routine_from_workout(p_session_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_routine uuid;
  v_status  text;
begin
  select s.routine_id, s.status into v_routine, v_status
    from public.workout_sessions s
   where s.id = p_session_id and s.user_id = v_uid;
  if not found then
    raise exception 'Treino não encontrado' using errcode = 'P0002';
  end if;
  if v_status <> 'completed' then
    raise exception 'Finalize o treino antes de atualizar a rotina' using errcode = '22023';
  end if;
  if v_routine is null or not exists (
    select 1 from public.routines r where r.id = v_routine and r.user_id = v_uid and r.archived_at is null
  ) then
    raise exception 'Rotina não encontrada ou arquivada' using errcode = 'GP004';
  end if;
  if not exists (
    select 1 from public.session_exercises se
      join public.set_logs sl on sl.session_exercise_id = se.id and sl.is_completed
     where se.session_id = p_session_id
  ) then
    raise exception 'O treino não tem séries concluídas para levar à rotina' using errcode = 'GP003';
  end if;

  with old as (
    select distinct on (re.exercise_id) re.exercise_id, re.rest_seconds, re.notes
      from public.routine_exercises re
     where re.routine_id = v_routine
     order by re.exercise_id, re.position
  ),
  ex as (
    select se.exercise_id,
           se.position,
           se.notes,
           count(*) filter (where sl.set_type <> 'warmup') as working,
           count(*) as total,
           min(sl.reps) filter (where sl.set_type <> 'warmup' and sl.reps is not null) as reps_min,
           max(sl.reps) filter (where sl.set_type <> 'warmup' and sl.reps is not null) as reps_max,
           max(sl.weight_kg) filter (where sl.set_type <> 'warmup') as weight_max
      from public.session_exercises se
      join public.set_logs sl on sl.session_exercise_id = se.id and sl.is_completed
     where se.session_id = p_session_id
     group by se.id, se.exercise_id, se.position, se.notes
  ),
  cleared as (
    delete from public.routine_exercises re where re.routine_id = v_routine
  )
  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, target_weight_kg, rest_seconds, notes)
  select v_routine,
         ex.exercise_id,
         (row_number() over (order by ex.position))::integer,
         least(greatest(case when ex.working > 0 then ex.working else ex.total end, 1), 20)::smallint,
         case
           when ex.reps_min is null then null
           when ex.reps_min = ex.reps_max then ex.reps_min::text
           else ex.reps_min || '-' || ex.reps_max
         end,
         ex.weight_max,
         coalesce(old.rest_seconds, 90),
         coalesce(nullif(trim(ex.notes), ''), old.notes)
    from ex
    left join old on old.exercise_id = ex.exercise_id;

  update public.routines set updated_at = now() where id = v_routine;
  return v_routine;
end;
$$;

comment on function public.update_routine_from_workout(uuid) is
  'Faz os exercícios e séries de um treino finalizado virarem os da rotina dele. Erros: P0002, GP003, GP004.';

-- ---------------------------------------------------------------------
-- Permissões
-- ---------------------------------------------------------------------
revoke execute on function public.save_routine(uuid, uuid, text, smallint[], jsonb, boolean) from public, anon;
grant execute on function public.save_routine(uuid, uuid, text, smallint[], jsonb, boolean) to authenticated;
revoke execute on function public.update_routine_from_workout(uuid) from public, anon;
grant execute on function public.update_routine_from_workout(uuid) to authenticated;
