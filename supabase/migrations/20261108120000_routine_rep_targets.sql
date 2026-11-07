-- =====================================================================
-- GUF APP · Repetições da rotina: fixas ou faixa, em números
--
-- Antes: routine_exercises.target_reps era texto livre ("10", "8-12", "Falha"); cada leitor
-- interpretava o texto do seu jeito.
-- Agora: duas colunas smallint (2 bytes cada; nulo não ocupa espaço além do bit de nulos):
--   fixa          → target_reps_min = 10, target_reps_max = null
--   faixa         → target_reps_min = 8,  target_reps_max = 12 (sempre maior que o mínimo)
--   não definida  → os dois nulos
-- O modo (fixa ou faixa) NÃO é gravado: é "max preenchido ou não". Um tipo novo de meta no futuro
-- (ex.: até a falha) entra como outra coluna ou outro valor, sem reescrever estas.
--
-- Compatibilidade (expandir e depois contrair):
--  - target_reps fica vazio (check) e sai numa migration futura, quando nenhum app instalado o ler.
--  - save_routine e a importação de ficha continuam aceitando o texto antigo (app desatualizado no
--    celular) e convertem; app antigo que manda o texto vazio não apaga as repetições salvas.
--  - Texto que não é número ("Falha") vai para a observação do exercício ("Repetições: Falha").
-- =====================================================================

alter table public.routine_exercises
  add column target_reps_min smallint,
  add column target_reps_max smallint;

alter table public.routine_exercises
  add constraint routine_exercises_target_reps_min_check
    check (target_reps_min between 1 and 100),
  add constraint routine_exercises_target_reps_max_check
    check (target_reps_max is null or (target_reps_min is not null and target_reps_max > target_reps_min and target_reps_max <= 100));

comment on column public.routine_exercises.target_reps_min is
  'Repetições alvo (1–100). Sozinho = repetições fixas; com target_reps_max = faixa. Nulo = não definido.';
comment on column public.routine_exercises.target_reps_max is
  'Fim da faixa de repetições (maior que target_reps_min). Nulo = repetições fixas (ou não definidas).';

-- ---------------------------------------------------------------------
-- Leitura do texto antigo ("10", "8-12", "8–12", "8 a 12", "10 reps")
-- ---------------------------------------------------------------------
create function public.parse_rep_target(p_text text, out reps_min smallint, out reps_max smallint)
language plpgsql immutable
set search_path = ''
as $$
declare
  v_match text[] := regexp_match(
    coalesce(p_text, ''),
    '^\s*(\d{1,3})\s*(?:(?:-|–|—|a|até)\s*(\d{1,3}))?\s*(?:reps?|repetições)?\s*$',
    'i'
  );
  v_low  integer;
  v_high integer;
begin
  if v_match is null then
    return;
  end if;
  v_low := least(v_match[1]::integer, coalesce(v_match[2], v_match[1])::integer);
  v_high := greatest(v_match[1]::integer, coalesce(v_match[2], v_match[1])::integer);
  if v_low < 1 or v_high > 100 then
    return;
  end if;
  reps_min := v_low;
  reps_max := nullif(v_high, v_low);
end;
$$;

comment on function public.parse_rep_target(text) is
  'Converte o texto antigo das repetições alvo ("10", "8-12") em mínimo e máximo; texto que não é número devolve nulos.';

-- Item de exercício recebido pelas RPCs: chaves novas (target_reps_min/max) ou o texto antigo.
create function public.rep_target_from_item(p_item jsonb, out reps_min smallint, out reps_max smallint)
language plpgsql immutable
set search_path = ''
as $$
begin
  if p_item ? 'target_reps_min' then
    reps_min := (p_item ->> 'target_reps_min')::smallint;
    -- Máximo igual ao mínimo é repetição fixa.
    reps_max := nullif((p_item ->> 'target_reps_max')::smallint, reps_min);
    return;
  end if;
  select t.reps_min, t.reps_max into reps_min, reps_max from public.parse_rep_target(p_item ->> 'target_reps') t;
end;
$$;

comment on function public.rep_target_from_item(jsonb) is
  'Repetições alvo de um item de exercício das RPCs: target_reps_min/target_reps_max ou, de app antigo, o texto target_reps.';

-- O item diz algo sobre as repetições? (app antigo que manda o texto vazio não apaga o que está salvo)
create function public.rep_target_in_item(p_item jsonb)
returns boolean
language sql immutable
set search_path = ''
as $$
  select p_item ? 'target_reps_min' or nullif(trim(p_item ->> 'target_reps'), '') is not null;
$$;

revoke execute on function public.parse_rep_target(text) from public, anon;
grant execute on function public.parse_rep_target(text) to authenticated;
revoke execute on function public.rep_target_from_item(jsonb) from public, anon;
grant execute on function public.rep_target_from_item(jsonb) to authenticated;
revoke execute on function public.rep_target_in_item(jsonb) from public, anon;
grant execute on function public.rep_target_in_item(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Dados atuais
-- ---------------------------------------------------------------------
update public.routine_exercises re
   set (target_reps_min, target_reps_max) = (select t.reps_min, t.reps_max from public.parse_rep_target(re.target_reps) t)
 where re.target_reps is not null;

-- Texto que não é número não se perde: vai para a observação do exercício.
update public.routine_exercises re
   set notes = left(concat_ws(' · ', nullif(trim(re.notes), ''), 'Repetições: ' || trim(re.target_reps)), 500)
 where nullif(trim(re.target_reps), '') is not null
   and re.target_reps_min is null;

update public.routine_exercises set target_reps = null where target_reps is not null;

alter table public.routine_exercises
  add constraint routine_exercises_target_reps_retired check (target_reps is null);

comment on column public.routine_exercises.target_reps is
  'DESCONTINUADA (sempre nula): use target_reps_min/target_reps_max. Será removida quando nenhum app instalado a ler.';

-- ---------------------------------------------------------------------
-- save_routine
-- ---------------------------------------------------------------------
-- p_exercises: [{ id, exercise_id, target_sets, target_reps_min, target_reps_max, target_weight_kg, rest_seconds, notes }]
-- (app antigo: target_reps em texto no lugar de min/max).
create or replace function public.save_routine(
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
  insert into public.routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_weight_kg, rest_seconds, notes)
  select (e.value ->> 'id')::uuid,
         v_id,
         (e.value ->> 'exercise_id')::uuid,
         e.ordinality::integer,
         (e.value ->> 'target_sets')::smallint,
         reps.reps_min,
         reps.reps_max,
         (e.value ->> 'target_weight_kg')::numeric,
         (e.value ->> 'rest_seconds')::smallint,
         nullif(trim(e.value ->> 'notes'), '')
    from jsonb_array_elements(p_exercises) with ordinality as e(value, ordinality)
    cross join lateral public.rep_target_from_item(e.value) as reps
  on conflict (id) do update
     set exercise_id      = excluded.exercise_id,
         position         = excluded.position,
         target_sets      = excluded.target_sets,
         -- App antigo com o texto vazio (ele não lê mais as repetições): mantém as salvas.
         target_reps_min  = case when public.rep_target_in_item(p_exercises -> (excluded.position - 1))
                                 then excluded.target_reps_min
                                 else public.routine_exercises.target_reps_min end,
         target_reps_max  = case when public.rep_target_in_item(p_exercises -> (excluded.position - 1))
                                 then excluded.target_reps_max
                                 else public.routine_exercises.target_reps_max end,
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

-- ---------------------------------------------------------------------
-- Atualizar a rotina com o treino finalizado
-- ---------------------------------------------------------------------
-- Repetições: menor e maior das séries concluídas sem aquecimento (iguais = fixa; diferentes = faixa).
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
           -- Limites da coluna (1–100): série com mais repetições conta como 100.
           least(min(sl.reps) filter (where sl.set_type <> 'warmup' and sl.reps > 0), 100) as reps_min,
           least(max(sl.reps) filter (where sl.set_type <> 'warmup' and sl.reps > 0), 100) as reps_max,
           max(sl.weight_kg) filter (where sl.set_type <> 'warmup') as weight_max
      from public.session_exercises se
      join public.set_logs sl on sl.session_exercise_id = se.id and sl.is_completed
     where se.session_id = p_session_id
     group by se.id, se.exercise_id, se.position, se.notes
  ),
  cleared as (
    delete from public.routine_exercises re where re.routine_id = v_routine
  )
  insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, target_weight_kg, rest_seconds, notes)
  select v_routine,
         ex.exercise_id,
         (row_number() over (order by ex.position))::integer,
         least(greatest(case when ex.working > 0 then ex.working else ex.total end, 1), 20)::smallint,
         ex.reps_min::smallint,
         nullif(ex.reps_max, ex.reps_min)::smallint,
         ex.weight_max,
         coalesce(old.rest_seconds, 90),
         coalesce(nullif(trim(ex.notes), ''), old.notes)
    from ex
    left join old on old.exercise_id = ex.exercise_id;

  update public.routines set updated_at = now() where id = v_routine;
  return v_routine;
end;
$$;

-- ---------------------------------------------------------------------
-- Importar ficha (o GUF AI ainda manda o texto; as RPCs convertem)
-- ---------------------------------------------------------------------
create or replace function public.plan_import_append_to_routine(p_routine_id uuid, p_project_id uuid, p_exercises jsonb, p_new_ids jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_item     jsonb;
  v_exercise uuid;
  v_next     integer;
  v_reps     record;
begin
  perform 1
     from public.routines r
    where r.id = p_routine_id and r.user_id = v_uid and r.project_id = p_project_id and r.archived_at is null
      for update;
  if not found then
    raise exception 'Rotina não encontrada ou arquivada' using errcode = 'GP004';
  end if;

  select coalesce(max(position), 0) into v_next from public.routine_exercises where routine_id = p_routine_id;

  for v_item in select value from jsonb_array_elements(p_exercises) loop
    v_exercise := public.plan_import_exercise_id(v_item, p_new_ids);
    continue when exists (select 1 from public.routine_exercises where routine_id = p_routine_id and exercise_id = v_exercise);
    v_next := v_next + 1;
    select * into v_reps from public.rep_target_from_item(v_item);
    insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds, notes)
    values (
      p_routine_id,
      v_exercise,
      v_next,
      (v_item ->> 'target_sets')::smallint,
      v_reps.reps_min,
      v_reps.reps_max,
      (v_item ->> 'rest_seconds')::smallint,
      nullif(trim(v_item ->> 'notes'), '')
    );
  end loop;

  update public.routines set updated_at = now() where id = p_routine_id;
end;
$$;

create or replace function public.import_training_plan(
  p_project_id uuid,
  p_project_name text,
  p_activate boolean,
  p_new_exercises jsonb,
  p_routines jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_project   uuid := p_project_id;
  v_new_ids   jsonb := '{}'::jsonb;
  v_new       jsonb;
  v_routine   jsonb;
  v_item      jsonb;
  v_exercise  uuid;
  v_planned   jsonb;
  v_reps      record;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;

  -- Mesmos limites do app (PLAN_IMPORT_MAX_* em packages/core/src/plan-import.ts).
  if jsonb_typeof(p_routines) is distinct from 'array'
     or jsonb_array_length(p_routines) not between 1 and 10
     or jsonb_typeof(coalesce(p_new_exercises, '[]'::jsonb)) is distinct from 'array'
     or jsonb_array_length(coalesce(p_new_exercises, '[]'::jsonb)) > 250
     or exists (
       select 1 from jsonb_array_elements(p_routines) r
        where jsonb_typeof(r -> 'exercises') is distinct from 'array'
           or jsonb_array_length(r -> 'exercises') not between 1 and 25
     ) then
    raise exception 'Ficha fora dos limites da importação' using errcode = 'GI002';
  end if;

  -- Rotina existente só num projeto que já existe (projeto novo não tem rotinas).
  if v_project is null and exists (select 1 from jsonb_array_elements(p_routines) r where r ? 'routine_id') then
    raise exception 'Rotina não encontrada ou arquivada' using errcode = 'GP004';
  end if;

  if v_project is null then
    insert into public.projects (user_id, name) values (v_uid, trim(p_project_name))
    returning id into v_project;
    if coalesce(p_activate, false) then
      perform public.activate_project(v_project);
    end if;
  elsif not exists (
    select 1 from public.projects where id = v_project and user_id = v_uid and archived_at is null
  ) then
    raise exception 'Projeto não encontrado ou arquivado' using errcode = 'GP001';
  end if;

  -- Exercício "novo" com o mesmo nome de um do catálogo do guf ou de um seu: reaproveita, não duplica.
  for v_new in select value from jsonb_array_elements(coalesce(p_new_exercises, '[]'::jsonb)) loop
    select e.id into v_exercise
      from public.exercises e
     where e.archived_at is null
       and (e.user_id is null or e.user_id = v_uid)
       and lower(e.name) = lower(trim(v_new ->> 'name'))
     order by e.user_id nulls first, e.created_at
     limit 1;
    if v_exercise is null then
      insert into public.exercises (user_id, name, muscle_group, equipment)
      values (v_uid, trim(v_new ->> 'name'), v_new ->> 'muscle_group', coalesce(v_new ->> 'equipment', 'outro'))
      returning id into v_exercise;
    end if;
    v_new_ids := v_new_ids || jsonb_build_object(v_new ->> 'key', v_exercise);
  end loop;

  for v_routine in select value from jsonb_array_elements(p_routines) loop
    if v_routine ? 'routine_id' then
      perform public.plan_import_append_to_routine((v_routine ->> 'routine_id')::uuid, v_project, v_routine -> 'exercises', v_new_ids);
      continue;
    end if;

    v_planned := '[]'::jsonb;
    for v_item in select value from jsonb_array_elements(v_routine -> 'exercises') loop
      select * into v_reps from public.rep_target_from_item(v_item);
      v_planned := v_planned || jsonb_build_array(jsonb_build_object(
        'id',              gen_random_uuid(),
        'exercise_id',     public.plan_import_exercise_id(v_item, v_new_ids),
        'target_sets',     v_item -> 'target_sets',
        'target_reps_min', v_reps.reps_min,
        'target_reps_max', v_reps.reps_max,
        'rest_seconds',    v_item -> 'rest_seconds',
        'notes',           v_item ->> 'notes'
      ));
    end loop;

    perform public.save_routine(
      null,
      v_project,
      v_routine ->> 'name',
      array(select d::smallint from jsonb_array_elements_text(coalesce(v_routine -> 'weekdays', '[]'::jsonb)) as d),
      v_planned,
      true
    );
  end loop;

  return v_project;
end;
$$;
