-- =====================================================================
-- GUF APP · Painel: editar e excluir exercícios do catálogo do guf (exercises.user_id nulo).
-- Documento: docs/admin-panel.md §5.6
--
-- Excluir: rotinas, treinos e séries apontam para o exercício com "on delete restrict" (histórico das
-- pessoas). Sem nenhum uso, o exercício é apagado; com uso, é ARQUIVADO (archived_at): some do
-- catálogo do painel e do seletor do app, e treinos, rotinas e evolução continuam com ele.
-- Editar: nome (sem repetir outro do catálogo), grupo e equipamento. Exercício já usado não troca
-- entre cardio e força (as séries guardam medidas diferentes: km/tempo × carga/repetições).
-- Uso mostrado à equipe só em números (rotinas, treinos), nunca quem usa.
-- Cadastrar/editar/excluir: Admin (manage_exercises). Auditado sem dado de pessoas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Ações novas da auditoria
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
    'staff_sent_password_reset', 'staff_created_exercises',
    'staff_updated_exercise', 'staff_deleted_exercise'));

-- ---------------------------------------------------------------------
-- 2. Apoio: exercício do catálogo ativo (GA020 = não encontrado) e uso em números
-- ---------------------------------------------------------------------
create or replace function public.catalog_exercise_or_fail(p_id uuid)
returns public.exercises
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_exercise public.exercises;
begin
  select * into v_exercise from public.exercises e
   where e.id = p_id and e.user_id is null and e.archived_at is null;
  if not found then
    raise exception 'Exercício não encontrado no catálogo' using errcode = 'GA020';
  end if;
  return v_exercise;
end;
$$;

create or replace function public.admin_exercise_usage(p_id uuid)
returns table (routines bigint, workouts bigint)
language plpgsql stable security definer
set search_path = ''
as $$
begin
  perform public.require_staff('viewer');
  perform public.catalog_exercise_or_fail(p_id);
  return query
  select (select count(distinct re.routine_id) from public.routine_exercises re where re.exercise_id = p_id),
         (select count(distinct se.session_id) from public.session_exercises se where se.exercise_id = p_id);
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Editar
-- ---------------------------------------------------------------------
create or replace function public.admin_update_exercise(p_id uuid, p_name text, p_muscle_group text, p_equipment text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff   public.staff_members := public.require_staff('admin');
  v_current public.exercises := public.catalog_exercise_or_fail(p_id);
  v_name    text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_in_use  boolean;
begin
  if char_length(v_name) not between 1 and 100
     or p_muscle_group is null
     or p_muscle_group not in ('peito', 'costas', 'ombros', 'biceps', 'triceps', 'antebraco', 'quadriceps', 'posterior',
                               'gluteos', 'panturrilha', 'abdomen', 'corpo_inteiro', 'cardio')
     or p_equipment is null
     or p_equipment not in ('barra', 'halter', 'maquina', 'polia', 'peso_corporal', 'kettlebell', 'smith', 'elastico', 'outro') then
    raise exception 'Exercício inválido' using errcode = 'GA019';
  end if;

  if v_name = v_current.name and p_muscle_group = v_current.muscle_group and p_equipment = v_current.equipment then
    raise exception 'Nada mudou' using errcode = 'GA012';
  end if;

  if exists (select 1 from public.exercises e
              where e.user_id is null and e.archived_at is null and e.id <> p_id
                and public.exercise_name_key(e.name) = public.exercise_name_key(v_name)) then
    raise exception 'Já existe um exercício com esse nome' using errcode = 'GA021';
  end if;

  v_in_use := exists (select 1 from public.routine_exercises re where re.exercise_id = p_id)
           or exists (select 1 from public.session_exercises se where se.exercise_id = p_id);
  if v_in_use and (v_current.muscle_group = 'cardio') <> (p_muscle_group = 'cardio') then
    raise exception 'Exercício em uso não troca entre cardio e força' using errcode = 'GA022';
  end if;

  update public.exercises e
     set name = v_name, muscle_group = p_muscle_group, equipment = p_equipment
   where e.id = p_id;

  perform public.staff_audit('staff_updated_exercise', null, null, null,
    jsonb_build_object('exercise_id', p_id,
      'fields', to_jsonb(array_remove(array[
        case when v_name <> v_current.name then 'name' end,
        case when p_muscle_group <> v_current.muscle_group then 'muscle_group' end,
        case when p_equipment <> v_current.equipment then 'equipment' end], null))));
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Excluir (apaga sem uso; arquiva com uso). Devolve 'deleted' ou 'archived'.
-- ---------------------------------------------------------------------
create or replace function public.admin_delete_exercise(p_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_staff  public.staff_members := public.require_staff('admin');
  v_result text;
begin
  perform public.catalog_exercise_or_fail(p_id);

  if exists (select 1 from public.routine_exercises re where re.exercise_id = p_id)
     or exists (select 1 from public.session_exercises se where se.exercise_id = p_id)
     or exists (select 1 from public.set_logs sl where sl.exercise_id = p_id) then
    update public.exercises e set archived_at = now() where e.id = p_id;
    v_result := 'archived';
  else
    delete from public.exercises e where e.id = p_id;
    v_result := 'deleted';
  end if;

  perform public.staff_audit('staff_deleted_exercise', null, null, null,
    jsonb_build_object('exercise_id', p_id, 'result', v_result));
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Auditoria: registros do catálogo (cadastrar, editar, excluir) aparecem como "Catálogo de exercícios"
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
           when a.subject_id is null and a.action like 'staff\_%exercise%' then 'Catálogo de exercícios'
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
-- 6. Permissões (só o painel)
-- ---------------------------------------------------------------------
revoke execute on function public.catalog_exercise_or_fail(uuid) from public, anon, authenticated;

revoke execute on function
  public.admin_exercise_usage(uuid),
  public.admin_update_exercise(uuid, text, text, text),
  public.admin_delete_exercise(uuid)
  from public, anon;

grant execute on function
  public.admin_exercise_usage(uuid),
  public.admin_update_exercise(uuid, text, text, text),
  public.admin_delete_exercise(uuid)
  to authenticated;
