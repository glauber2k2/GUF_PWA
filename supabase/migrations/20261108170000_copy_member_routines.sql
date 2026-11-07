-- =====================================================================
-- GUF APP · Copiar rotina ou projeto do perfil de outra pessoa
-- (Claude Design "Perfil - Projeto Ativo" · 2c: "Copiar rotina" e "Copiar projeto inteiro")
--
-- Quem pode: quem vê o projeto ativo no perfil (can_view_member + can_view_member_history, as
-- mesmas regras de get_member_active_project). Só o projeto ATIVO da pessoa e as rotinas dele.
-- O que vem: nome, descrição (projeto), dias (só ao copiar o projeto), exercícios na ordem, séries,
-- repetições e descanso. O que NÃO vem: cargas planejadas, observações (da rotina e dos
-- exercícios) e qualquer histórico. A cópia é independente: mudar ou apagar o original não muda nada.
-- Exercício próprio da outra pessoa (user_id dela) nunca entra na conta de quem copia
-- (guard_exercise_owner): vira um exercício próprio de quem copia, com o mesmo nome, grupo e
-- equipamento (reaproveita um seu com o mesmo nome e grupo, se houver).
-- Limites do plano (projetos e rotinas por projeto) valem pelos gatilhos de sempre (GL001).
-- Erros: GS004 (pessoa), GS006 (histórico oculto), GP001 (projeto de destino), GP004 (rotina
-- fora do projeto ativo da pessoa), GS010 (copiar de si mesmo).
-- =====================================================================

-- Exercício que entra na conta de quem copia: o do catálogo do guf continua o mesmo; o próprio da
-- outra pessoa vira (ou reaproveita) um exercício próprio de quem copia.
create function public.copy_exercise_for(p_exercise_id uuid, p_user_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_source public.exercises;
  v_id     uuid;
begin
  select * into v_source from public.exercises e where e.id = p_exercise_id;
  if v_source.user_id is null or v_source.user_id = p_user_id then
    return v_source.id;
  end if;

  select e.id into v_id
    from public.exercises e
   where e.user_id = p_user_id
     and e.archived_at is null
     and e.muscle_group = v_source.muscle_group
     and public.exercise_name_key(e.name) = public.exercise_name_key(v_source.name)
   limit 1;
  if v_id is not null then
    return v_id;
  end if;

  insert into public.exercises (user_id, name, muscle_group, equipment)
  values (p_user_id, v_source.name, v_source.muscle_group, v_source.equipment)
  returning id into v_id;
  return v_id;
end;
$$;

-- Copia os exercícios planejados de uma rotina para outra (sem cargas nem observações).
create function public.copy_routine_exercises(p_from_routine uuid, p_to_routine uuid, p_user_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.routine_exercises
    (routine_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, rest_seconds)
  select p_to_routine, public.copy_exercise_for(re.exercise_id, p_user_id), re.position,
         re.target_sets, re.target_reps_min, re.target_reps_max, re.rest_seconds
    from public.routine_exercises re
   where re.routine_id = p_from_routine
   order by re.position;
end;
$$;

-- Confere quem copia e de quem: as mesmas regras de quem vê o projeto ativo no perfil.
create function public.assert_can_copy_from(p_uid uuid, p_owner uuid)
returns void
language plpgsql stable security definer
set search_path = ''
as $$
begin
  if p_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if p_owner = p_uid then
    raise exception 'Esta rotina já é sua' using errcode = 'GS010';
  end if;
  if not public.can_view_member(p_uid, p_owner) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;
  if not public.can_view_member_history(p_uid, p_owner) then
    raise exception 'Esta pessoa ocultou o histórico de treinos' using errcode = 'GS006';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Copiar uma rotina do projeto ativo de outra pessoa para um projeto seu (ou um projeto novo
-- com o nome da rotina, quando p_target_project_id é nulo). Devolve { routine_id, project_id }.
-- ---------------------------------------------------------------------
create function public.copy_member_routine(p_routine_id uuid, p_target_project_id uuid default null)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_source  record;
  v_project uuid := p_target_project_id;
  v_routine uuid;
begin
  select r.id, r.name, r.user_id into v_source
    from public.routines r
    join public.projects p on p.id = r.project_id
   where r.id = p_routine_id and r.archived_at is null and p.is_active and p.archived_at is null;
  if not found then
    raise exception 'Rotina não encontrada' using errcode = 'GP004';
  end if;
  perform public.assert_can_copy_from(v_uid, v_source.user_id);

  if v_project is null then
    insert into public.projects (user_id, name, position)
    values (v_uid, left(v_source.name, 100),
            coalesce((select max(p.position) + 1 from public.projects p where p.user_id = v_uid), 0))
    returning id into v_project;
  elsif not exists (
    select 1 from public.projects p where p.id = v_project and p.user_id = v_uid and p.archived_at is null
  ) then
    raise exception 'Projeto não encontrado' using errcode = 'GP001';
  end if;

  insert into public.routines (user_id, project_id, name, position)
  values (v_uid, v_project, v_source.name,
          coalesce((select max(r.position) + 1 from public.routines r where r.project_id = v_project and r.archived_at is null), 0))
  returning id into v_routine;
  perform public.copy_routine_exercises(v_source.id, v_routine, v_uid);

  return jsonb_build_object('routine_id', v_routine, 'project_id', v_project);
end;
$$;

-- ---------------------------------------------------------------------
-- Copiar o projeto ativo de outra pessoa inteiro (rotinas com dias, exercícios, séries,
-- repetições e descanso). p_activate: vira o seu projeto ativo (activate_project). Devolve o id.
-- ---------------------------------------------------------------------
create function public.copy_member_project(p_user_id uuid, p_activate boolean default false)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_source  record;
  v_project uuid;
  v_routine record;
  v_new     uuid;
begin
  perform public.assert_can_copy_from(v_uid, p_user_id);
  -- O Favoritos de outra pessoa vira um projeto comum: com o nome dela, para não confundir com o seu.
  select p.id, p.description,
         case when p.is_favorites
              then left('Rotinas de @' || coalesce((select sp.handle from public.social_profiles sp where sp.user_id = p_user_id), 'guf'), 100)
              else p.name end as name
    into v_source
    from public.projects p
   where p.user_id = p_user_id and p.is_active and p.archived_at is null;
  if not found then
    raise exception 'Projeto não encontrado' using errcode = 'GP001';
  end if;

  insert into public.projects (user_id, name, description, position)
  values (v_uid, v_source.name, v_source.description,
          coalesce((select max(p.position) + 1 from public.projects p where p.user_id = v_uid), 0))
  returning id into v_project;

  for v_routine in
    select r.id, r.name, r.position, r.weekdays
      from public.routines r
     where r.project_id = v_source.id and r.archived_at is null
     order by r.position
  loop
    insert into public.routines (user_id, project_id, name, position, weekdays)
    values (v_uid, v_project, v_routine.name, v_routine.position, v_routine.weekdays)
    returning id into v_new;
    perform public.copy_routine_exercises(v_routine.id, v_new, v_uid);
  end loop;

  if p_activate then
    perform public.activate_project(v_project);
  end if;
  return v_project;
end;
$$;

comment on function public.copy_member_routine(uuid, uuid) is
  'Copia uma rotina do projeto ativo de outra pessoa (quem vê o histórico) para um projeto seu ou um novo; sem cargas nem observações. Erros: GS004, GS006, GS010, GP001, GP004, GL001.';
comment on function public.copy_member_project(uuid, boolean) is
  'Copia o projeto ativo de outra pessoa (quem vê o histórico) com rotinas, dias, séries, repetições e descanso; sem cargas nem observações. Erros: GS004, GS006, GS010, GP001, GL001.';

revoke execute on function
  public.copy_exercise_for(uuid, uuid),
  public.copy_routine_exercises(uuid, uuid, uuid),
  public.assert_can_copy_from(uuid, uuid)
  from public, anon, authenticated;
revoke execute on function public.copy_member_routine(uuid, uuid), public.copy_member_project(uuid, boolean) from public, anon;
grant execute on function public.copy_member_routine(uuid, uuid), public.copy_member_project(uuid, boolean) to authenticated;
