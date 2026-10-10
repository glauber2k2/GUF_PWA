-- =====================================================================
-- GUF APP · Dias da semana das rotinas, projeto padrão "Favoritos" e salvar rotina
--
-- 1. routines.weekdays: dias em que a rotina é feita (ISO: 1 = segunda … 7 = domingo).
--    A Início mostra o treino de hoje do projeto ativo por esses dias.
-- 2. Projeto "Favoritos": todo usuário tem um (criado no cadastro). Não existe rotina
--    avulsa — rotinas sem outro projeto ficam nele. Não pode ser renomeado, arquivado
--    nem excluído pelo app (erro GP002); a exclusão da conta continua apagando tudo.
-- 3. save_routine: grava nome, projeto, dias e exercícios planejados numa transação.
--
-- Erros próprios: GP001 projeto não encontrado/arquivado · GP002 Favoritos protegido ·
-- GP003 rotina sem exercícios · GP004 rotina não encontrada/arquivada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Dias da semana da rotina
-- ---------------------------------------------------------------------
alter table public.routines
  add column weekdays smallint[] not null default '{}'
  check (weekdays <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);

comment on column public.routines.weekdays is
  'Dias da semana da rotina (ISO: 1 = segunda … 7 = domingo). Vazio = sem dia fixo.';

-- ---------------------------------------------------------------------
-- 2. Projeto padrão "Favoritos"
-- ---------------------------------------------------------------------
alter table public.projects
  add column is_favorites boolean not null default false;

comment on column public.projects.is_favorites is
  'Projeto padrão "Favoritos" (um por usuário, criado no cadastro; não pode ser renomeado, arquivado nem excluído pelo app).';

create unique index projects_one_favorites_per_user
  on public.projects (user_id) where is_favorites;

-- Proteção: pedidos do app (usuário logado → auth.uid() preenchido) não podem criar,
-- renomear, arquivar, excluir nem desmarcar o Favoritos. Gatilho de cadastro e
-- exclusão de conta (service role / cascata) não têm auth.uid() e passam.
create or replace function public.protect_favorites_project()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' and new.is_favorites then
    raise exception 'O projeto Favoritos é criado automaticamente' using errcode = 'GP002';
  elsif tg_op = 'UPDATE' and (
        new.is_favorites <> old.is_favorites
     or (old.is_favorites and (new.name <> old.name or new.archived_at is not null))
  ) then
    raise exception 'O projeto Favoritos não pode ser renomeado nem arquivado' using errcode = 'GP002';
  elsif tg_op = 'DELETE' and old.is_favorites then
    raise exception 'O projeto Favoritos não pode ser excluído' using errcode = 'GP002';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger projects_protect_favorites
  before insert or update or delete on public.projects
  for each row execute function public.protect_favorites_project();

-- Cadastro: além de perfil, plano e aceites, cria o Favoritos (ativo: é o único projeto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_ids      jsonb := new.raw_user_meta_data -> 'accepted_document_ids';
  v_platform text  := new.raw_user_meta_data ->> 'signup_platform';
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'), 100),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );

  insert into public.entitlements (user_id) values (new.id);

  insert into public.projects (user_id, name, is_active, is_favorites, position)
  values (new.id, 'Favoritos', true, true, 0);

  if coalesce(new.raw_app_meta_data ->> 'provider', 'email') = 'email'
     and jsonb_typeof(v_ids) = 'array' then

    if v_platform is not null and v_platform not in ('web', 'ios', 'android') then
      v_platform := null;
    end if;

    -- Compara como texto: um id malformado não gera erro de conversão (seria ignorado).
    insert into public.consent_records (user_id, document_id, action, source, platform)
    select new.id, d.id, 'granted', 'signup_email', v_platform
      from public.legal_documents d
     where d.id::text in (
             select lower(trim(e.value))
               from jsonb_array_elements_text(v_ids) as e(value)
           )
       and d.id in (
             select (public.current_legal_document(t)).id
               from unnest(array['terms', 'privacy', 'age_declaration']) as t
           );
  end if;

  return new;
end;
$$;

-- Usuários já cadastrados: cria o Favoritos (ativo só se não houver outro projeto ativo).
insert into public.projects (user_id, name, is_active, is_favorites, position)
select u.id, 'Favoritos',
       not exists (select 1 from public.projects p where p.user_id = u.id and p.is_active),
       true, 0
  from auth.users u
 where not exists (select 1 from public.projects p where p.user_id = u.id and p.is_favorites);

-- ---------------------------------------------------------------------
-- 3. Salvar rotina (nova ou existente) com os exercícios planejados
--    p_exercises: [{ id, exercise_id, target_sets, target_reps, rest_seconds, notes }] na ordem.
--    Ids gerados no app; exercícios que saíram da lista são apagados.
-- ---------------------------------------------------------------------
create or replace function public.save_routine(
  p_routine_id uuid,
  p_project_id uuid,
  p_name text,
  p_weekdays smallint[],
  p_exercises jsonb
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
    insert into public.routines (user_id, project_id, name, weekdays, position)
    values (v_uid, p_project_id, trim(p_name), coalesce(p_weekdays, '{}'), v_next)
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
           position = case when v_project is distinct from p_project_id then v_next else position end
     where id = v_id;
  end if;

  delete from public.routine_exercises re
   where re.routine_id = v_id
     and re.id <> all (array(select (e ->> 'id')::uuid from jsonb_array_elements(p_exercises) as e));

  -- user_id vem do gatilho fill_from_routine; position segue a ordem recebida.
  insert into public.routine_exercises (id, routine_id, exercise_id, position, target_sets, target_reps, rest_seconds, notes)
  select (e.value ->> 'id')::uuid,
         v_id,
         (e.value ->> 'exercise_id')::uuid,
         e.ordinality::integer,
         (e.value ->> 'target_sets')::smallint,
         nullif(trim(e.value ->> 'target_reps'), ''),
         (e.value ->> 'rest_seconds')::smallint,
         nullif(trim(e.value ->> 'notes'), '')
    from jsonb_array_elements(p_exercises) with ordinality as e(value, ordinality)
  on conflict (id) do update
     set exercise_id  = excluded.exercise_id,
         position     = excluded.position,
         target_sets  = excluded.target_sets,
         target_reps  = excluded.target_reps,
         rest_seconds = excluded.rest_seconds,
         notes        = excluded.notes
   where public.routine_exercises.routine_id = v_id;

  return v_id;
end;
$$;

comment on function public.save_routine(uuid, uuid, text, smallint[], jsonb) is
  'Cria ou atualiza a rotina (nome, projeto, dias) e seus exercícios planejados numa transação. Erros: GP001, GP003, GP004.';

-- ---------------------------------------------------------------------
-- PERMISSÕES
-- ---------------------------------------------------------------------
revoke execute on function public.save_routine(uuid, uuid, text, smallint[], jsonb) from public, anon;
grant execute on function public.save_routine(uuid, uuid, text, smallint[], jsonb) to authenticated;
revoke execute on function public.protect_favorites_project() from public, anon, authenticated;
