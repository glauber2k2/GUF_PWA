-- =====================================================================
-- GUF APP · Painel: catálogo de exercícios do guf (exercises.user_id nulo).
-- Documento: docs/admin-panel.md §5.6
--
-- Listar (com busca e vários grupos musculares), conferir nomes já cadastrados e cadastrar em lote
-- (manual ou a partir de um arquivo convertido no navegador e revisado pela pessoa da equipe).
-- O app lê o catálogo pelo RLS que já existe ("ver globais e próprios"); nenhuma política nova.
-- Consultar: Leitura+. Cadastrar: Admin (o catálogo aparece para todas as contas).
-- Nome repetido no catálogo (sem diferenciar maiúsculas, acentos e espaços) não entra de novo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ação nova da auditoria
-- ---------------------------------------------------------------------
alter table public.audit_log drop constraint audit_log_action_check;
alter table public.audit_log add constraint audit_log_action_check
  check (action in (
    'consent_granted', 'consent_revoked', 'health_data_deleted', 'data_exported',
    'account_deleted', 'consent_proofs_purged', 'audit_log_purged',
    'social_data_deleted', 'social_visibility_changed', 'follow_accepted', 'follow_ended', 'user_blocked',
    'ai_conversations_purged', 'plan_granted', 'plan_revoked',
    'staff_viewed_user', 'staff_revealed_email', 'staff_changed_plan', 'staff_changed_handle',
    'staff_changed_name', 'staff_unlinked_identity',
    'staff_member_added', 'staff_member_role_changed', 'staff_member_disabled', 'staff_member_enabled',
    'announcement_published', 'announcement_ended', 'announcements_purged',
    'staff_banned_user', 'staff_unbanned_user', 'staff_deleted_account',
    'staff_scheduled_deletion', 'staff_cancelled_deletion', 'scheduled_deletion_executed',
    'staff_sent_password_reset', 'staff_created_exercises'));

-- ---------------------------------------------------------------------
-- 2. Chave de comparação de nomes ("Supino  Reto" = "supino reto" = "Supíno reto")
-- ---------------------------------------------------------------------
create or replace function public.exercise_name_key(p_name text)
returns text
language sql immutable
set search_path = ''
as $$
  select regexp_replace(
           lower(translate(btrim(coalesce(p_name, '')),
             'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
             'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')),
           '\s+', ' ', 'g');
$$;

create index if not exists exercises_catalog_name_key_idx
  on public.exercises (public.exercise_name_key(name))
  where user_id is null;

-- ---------------------------------------------------------------------
-- 3. Listagem (catálogo ativo), com total para a paginação
-- ---------------------------------------------------------------------
create or replace function public.admin_list_exercises(
  p_query text default null, p_muscle_groups text[] default null, p_limit integer default 50, p_offset integer default 0
)
returns table (id uuid, name text, muscle_group text, equipment text, created_at timestamptz, total_count bigint)
language plpgsql stable security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_key text := public.exercise_name_key(p_query);
begin
  perform public.require_staff('viewer');
  return query
  select e.id, e.name, e.muscle_group, e.equipment, e.created_at, count(*) over ()
    from public.exercises e
   where e.user_id is null
     and e.archived_at is null
     and (v_key = '' or public.exercise_name_key(e.name) like '%' || v_key || '%')
     and (coalesce(cardinality(p_muscle_groups), 0) = 0 or e.muscle_group = any (p_muscle_groups))
   order by public.exercise_name_key(e.name)
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Nomes que já estão no catálogo (revisão do arquivo antes de cadastrar)
-- ---------------------------------------------------------------------
create or replace function public.admin_existing_exercise_names(p_names text[])
returns setof text
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.require_staff('viewer');
  if coalesce(cardinality(p_names), 0) > 500 then
    raise exception 'Muitos nomes de uma vez' using errcode = 'GA019';
  end if;
  return query
  select distinct n.name
    from unnest(p_names) as n(name)
   where exists (
     select 1 from public.exercises e
      where e.user_id is null and e.archived_at is null
        and public.exercise_name_key(e.name) = public.exercise_name_key(n.name));
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Cadastro em lote (uma transação). Devolve o que entrou e o que já existia.
--    p_exercises = [{ "name": "...", "muscle_group": "peito", "equipment": "barra" }, ...]
--    p_source = 'manual' | 'file' (só para a auditoria)
-- ---------------------------------------------------------------------
create or replace function public.admin_create_exercises(p_exercises jsonb, p_source text default 'manual')
returns table (name text, status text)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_staff   public.staff_members := public.require_staff('admin');
  v_item    jsonb;
  v_name    text;
  v_group   text;
  v_equip   text;
  v_created integer := 0;
  v_skipped integer := 0;
  v_seen    text[] := '{}';
begin
  if p_source not in ('manual', 'file') then
    raise exception 'Origem inválida' using errcode = 'GA019';
  end if;
  if jsonb_typeof(p_exercises) <> 'array' or jsonb_array_length(p_exercises) = 0 or jsonb_array_length(p_exercises) > 500 then
    raise exception 'Envie de 1 a 500 exercícios' using errcode = 'GA019';
  end if;

  for v_item in select * from jsonb_array_elements(p_exercises) loop
    v_name  := regexp_replace(btrim(coalesce(v_item ->> 'name', '')), '\s+', ' ', 'g');
    v_group := v_item ->> 'muscle_group';
    v_equip := coalesce(nullif(v_item ->> 'equipment', ''), 'outro');
    if char_length(v_name) not between 1 and 100
       or v_group is null
       or v_group not in ('peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco', 'quadriceps', 'posterior',
                          'gluteos', 'panturrilha', 'abdomen', 'corpo_inteiro', 'cardio')
       or v_equip not in ('barra', 'halter', 'maquina', 'polia', 'peso_corporal', 'kettlebell', 'smith', 'elastico', 'outro') then
      raise exception 'Exercício inválido: %', left(v_name, 100) using errcode = 'GA019';
    end if;

    if public.exercise_name_key(v_name) = any (v_seen) or exists (
         select 1 from public.exercises e
          where e.user_id is null and e.archived_at is null
            and public.exercise_name_key(e.name) = public.exercise_name_key(v_name)) then
      v_skipped := v_skipped + 1;
      name := v_name; status := 'duplicate';
      return next;
      continue;
    end if;

    insert into public.exercises (user_id, name, muscle_group, equipment) values (null, v_name, v_group, v_equip);
    v_seen := v_seen || public.exercise_name_key(v_name);
    v_created := v_created + 1;
    name := v_name; status := 'created';
    return next;
  end loop;

  if v_created > 0 then
    perform public.staff_audit('staff_created_exercises', null, null, null,
      jsonb_build_object('created', v_created, 'skipped', v_skipped, 'source', p_source));
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Auditoria: registro sem conta (catálogo, comunicados) não aparece mais como "Conta excluída"
-- ---------------------------------------------------------------------
create or replace function public.admin_list_audit(
  p_actor_id uuid default null, p_action text default null, p_from timestamptz default null,
  p_subject text default null, p_before_id bigint default null, p_limit integer default 30
)
returns table (
  id bigint, occurred_at timestamptz, actor_id uuid, actor_name text, action text,
  subject_id uuid, subject_label text, details jsonb
)
language plpgsql security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_handle  text := public.normalize_handle(p_subject);
begin
  perform public.require_staff('admin');
  return query
  select a.id, a.occurred_at, a.actor_id,
         coalesce(actor.display_name, case when a.actor_type = 'service' then 'Sistema' else 'Equipe' end),
         a.action, a.subject_id,
         case
           when a.subject_id is null and a.action = 'staff_created_exercises' then 'Catálogo de exercícios'
           when a.subject_id is null and a.action like 'announcement%' then 'Comunicado'
           when a.subject_id is null then '—'
           else coalesce(subject_staff.display_name, case when sp.handle is not null then '@' || sp.handle end, p.name, 'Conta excluída')
         end,
         a.details
    from public.audit_log a
    left join public.staff_members actor on actor.user_id = a.actor_id
    left join public.staff_members subject_staff on subject_staff.user_id = a.subject_id
    left join public.social_profiles sp on sp.user_id = a.subject_id
    left join public.profiles p on p.id = a.subject_id
   where (a.actor_type = 'staff' or a.action like 'staff\_member\_%' or a.action like 'announcement%'
          or a.action = 'scheduled_deletion_executed')
     and (p_actor_id is null or a.actor_id = p_actor_id)
     and (p_action is null or a.action = p_action)
     and (p_from is null or a.occurred_at >= p_from)
     and (p_before_id is null or a.id < p_before_id)
     and (v_subject is null
          or a.subject_id::text = v_subject
          or sp.handle like v_handle || '%'
          or p.name ilike '%' || v_subject || '%'
          or subject_staff.display_name ilike '%' || v_subject || '%')
   order by a.id desc
   limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$;

-- ---------------------------------------------------------------------
-- 7. Permissões (só o painel; o app continua lendo o catálogo pelo RLS)
-- ---------------------------------------------------------------------
revoke execute on function
  public.admin_list_exercises(text, text[], integer, integer),
  public.admin_existing_exercise_names(text[]),
  public.admin_create_exercises(jsonb, text)
  from public, anon;

grant execute on function
  public.admin_list_exercises(text, text[], integer, integer),
  public.admin_existing_exercise_names(text[]),
  public.admin_create_exercises(jsonb, text)
  to authenticated;
