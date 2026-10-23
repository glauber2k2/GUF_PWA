-- =====================================================================
-- GUF APP · Importar ficha: mandar uma rotina da ficha para uma rotina que já existe
--
-- Na revisão, cada rotina da ficha vai para uma rotina NOVA (como antes) ou para uma rotina que já
-- existe no projeto de destino (`routine_id` no item de p_routines). Na existente, os exercícios
-- da ficha entram no FIM da lista e o que ela já tinha continua (nome, dias e exercícios); um
-- exercício que já está na rotina não entra de novo. Nada é apagado.
--
-- p_routines: [{ name, weekdays, routine_id?, exercises: [{ exercise_id | new_key, target_sets, target_reps, rest_seconds, notes }] }]
-- Erros novos: GP004 (rotina inexistente, arquivada, de outra pessoa ou fora do projeto escolhido).
-- =====================================================================

-- Apoio do import_training_plan (SECURITY INVOKER, como ele: RLS vale; sempre o usuário do token).
-- Exercício do item da ficha → id (novo pela chave; existente só do catálogo do guf ou da pessoa).
create function public.plan_import_exercise_id(p_item jsonb, p_new_ids jsonb)
returns uuid
language plpgsql stable
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_exercise uuid;
begin
  if p_item ? 'new_key' then
    v_exercise := (p_new_ids ->> (p_item ->> 'new_key'))::uuid;
  else
    select e.id into v_exercise
      from public.exercises e
     where e.id = (p_item ->> 'exercise_id')::uuid
       and (e.user_id is null or e.user_id = v_uid)
       and e.archived_at is null;
  end if;
  if v_exercise is null then
    raise exception 'Exercício indisponível: só o catálogo do guf ou os seus' using errcode = 'GI001';
  end if;
  return v_exercise;
end;
$$;

revoke execute on function public.plan_import_exercise_id(jsonb, jsonb) from public, anon;
grant execute on function public.plan_import_exercise_id(jsonb, jsonb) to authenticated;

-- Exercícios da ficha no fim de uma rotina existente (sem repetir os que ela já tem).
create function public.plan_import_append_to_routine(p_routine_id uuid, p_project_id uuid, p_exercises jsonb, p_new_ids jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_item     jsonb;
  v_exercise uuid;
  v_next     integer;
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
    insert into public.routine_exercises (routine_id, exercise_id, position, target_sets, target_reps, rest_seconds, notes)
    values (
      p_routine_id,
      v_exercise,
      v_next,
      (v_item ->> 'target_sets')::smallint,
      nullif(trim(v_item ->> 'target_reps'), ''),
      (v_item ->> 'rest_seconds')::smallint,
      nullif(trim(v_item ->> 'notes'), '')
    );
  end loop;

  update public.routines set updated_at = now() where id = p_routine_id;
end;
$$;

revoke execute on function public.plan_import_append_to_routine(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.plan_import_append_to_routine(uuid, uuid, jsonb, jsonb) to authenticated;

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
      v_planned := v_planned || jsonb_build_array(jsonb_build_object(
        'id',           gen_random_uuid(),
        'exercise_id',  public.plan_import_exercise_id(v_item, v_new_ids),
        'target_sets',  v_item -> 'target_sets',
        'target_reps',  v_item ->> 'target_reps',
        'rest_seconds', v_item -> 'rest_seconds',
        'notes',        v_item ->> 'notes'
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

comment on function public.import_training_plan(uuid, text, boolean, jsonb, jsonb) is
  'Cria (ou usa) o projeto, os exercícios novos e as rotinas de uma ficha convertida pelo GUF AI, numa transação. Rotina com routine_id: os exercícios entram no fim da rotina existente (sem repetir). Erros: GI001, GI002, GP001, GP003, GP004, GL001.';
