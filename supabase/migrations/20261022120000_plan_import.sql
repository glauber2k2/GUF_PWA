-- =====================================================================
-- GUF APP · Importar ficha de treino com o GUF AI
-- 1. ai_plan_imports: registro mínimo (só o horário) de cada conversão feita pela Edge Function guf-ai
--    fora do chat, para contar no limite diário do plano. Sem conteúdo; eliminado em 2 dias.
-- 2. import_training_plan: depois da revisão no app, cria o projeto (ou usa um existente), os
--    exercícios novos e as rotinas numa transação. Exercício do rascunho só pode ser do CATÁLOGO DO
--    GUF (user_id nulo), da própria pessoa (trocado na revisão) ou um novo criado aqui como dela: o id
--    de um exercício de outra pessoa nunca entra (a chave estrangeira não passa pelo RLS, por isso a
--    conferência).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Uso da importação (limite diário do GUF AI)
-- ---------------------------------------------------------------------
create table public.ai_plan_imports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.ai_plan_imports is
  'Uma linha por ficha convertida pelo GUF AI (só o horário), para o limite diário. Eliminada em 2 dias (purge_expired_ai_plan_imports).';

create index ai_plan_imports_user_idx on public.ai_plan_imports (user_id, created_at);
create index ai_plan_imports_created_idx on public.ai_plan_imports (created_at);

alter table public.ai_plan_imports enable row level security;

-- Sem update nem delete: apagar o registro não devolve a cota. Inserir só o dono (o horário é do banco).
revoke all on public.ai_plan_imports from anon, authenticated;
grant select on public.ai_plan_imports to authenticated;
grant insert (user_id) on public.ai_plan_imports to authenticated;

create policy ai_plan_imports_select on public.ai_plan_imports
  for select to authenticated using ((select auth.uid()) = user_id);
create policy ai_plan_imports_insert on public.ai_plan_imports
  for insert to authenticated with check ((select auth.uid()) = user_id);

create or replace function public.purge_expired_ai_plan_imports()
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.ai_plan_imports where created_at < now() - interval '2 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.purge_expired_ai_plan_imports() from public, anon, authenticated;

select cron.schedule(
  'purge-expired-ai-plan-imports',
  '41 3 * * *',                                     -- todo dia, 03:41 UTC
  $$select public.purge_expired_ai_plan_imports()$$
);

-- ---------------------------------------------------------------------
-- 2. Criar o que a ficha convertida trouxe
-- ---------------------------------------------------------------------
-- p_new_exercises: [{ key, name, muscle_group, equipment }]
-- p_routines:      [{ name, weekdays: [1..7], exercises: [{ exercise_id | new_key, target_sets, target_reps, rest_seconds, notes }] }]
-- SECURITY INVOKER: RLS e os limites do plano (gatilhos de projects e routines, erro GL001) valem.
create function public.import_training_plan(
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
    v_planned := '[]'::jsonb;
    for v_item in select value from jsonb_array_elements(v_routine -> 'exercises') loop
      if v_item ? 'new_key' then
        v_exercise := (v_new_ids ->> (v_item ->> 'new_key'))::uuid;
      else
        select e.id into v_exercise
          from public.exercises e
         where e.id = (v_item ->> 'exercise_id')::uuid
           and (e.user_id is null or e.user_id = v_uid)
           and e.archived_at is null;
      end if;
      if v_exercise is null then
        raise exception 'Exercício indisponível: só o catálogo do guf ou os seus' using errcode = 'GI001';
      end if;
      v_planned := v_planned || jsonb_build_array(jsonb_build_object(
        'id',           gen_random_uuid(),
        'exercise_id',  v_exercise,
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
  'Cria (ou usa) o projeto, os exercícios novos e as rotinas de uma ficha convertida pelo GUF AI, numa transação. Erros: GI001 (exercício que não é do catálogo do guf nem da pessoa), GI002 (fora dos limites), GP001, GP003, GL001.';

revoke execute on function public.import_training_plan(uuid, text, boolean, jsonb, jsonb) from public, anon;
grant execute on function public.import_training_plan(uuid, text, boolean, jsonb, jsonb) to authenticated;
