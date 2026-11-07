-- =====================================================================
-- GUF APP · Projeto ativo no perfil (Claude Design "Perfil - Projeto Ativo" · 2c)
--
-- O perfil mostra o projeto ativo da pessoa (nome, descrição e rotinas com dias, tempo médio e
-- exercícios com séries × repetições). Quem vê: exatamente quem vê o histórico de treinos
-- (can_view_member_history): a própria pessoa, seguidor aceito ou qualquer conta logada com o
-- perfil aberto, e ninguém além dela com o histórico oculto. A opção "Visibilidade de treino"
-- (social_profiles.history_hidden) liga e desliga os dois juntos: nenhuma coluna nova.
--
-- Fica de fora de propósito: cargas planejadas, observações (têm regra própria de aceite) e ids.
-- Erros: GS004 (pessoa inexistente, bloqueada ou perfil fechado), GS006 (histórico oculto).
-- =====================================================================

create function public.get_member_active_project(p_user_id uuid default null)
returns jsonb
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_owner   uuid := coalesce(p_user_id, (select auth.uid()));
  v_project record;
begin
  if v_uid is null then
    raise exception 'Não autenticado' using errcode = '28000';
  end if;
  if not public.can_view_member(v_uid, v_owner) then
    raise exception 'Pessoa não encontrada' using errcode = 'GS004';
  end if;
  if not public.can_view_member_history(v_uid, v_owner) then
    raise exception 'Esta pessoa ocultou o histórico de treinos' using errcode = 'GS006';
  end if;

  select p.id, p.name, p.description into v_project
    from public.projects p
   where p.user_id = v_owner and p.is_active and p.archived_at is null;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'name', v_project.name,
    'description', v_project.description,
    -- Rotina do último treino concluído: o app marca a próxima pela mesma regra da Início.
    'last_routine_id', (
      select s.routine_id
        from public.workout_sessions s
       where s.user_id = v_owner and s.status = 'completed'
       order by s.finished_at desc nulls last
       limit 1
    ),
    'routines', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', r.id,
               'name', r.name,
               'position', r.position,
               'weekdays', to_jsonb(r.weekdays),
               'average_duration_seconds', public.average_duration_seconds(r),
               'exercises', (
                 select coalesce(jsonb_agg(jsonb_build_object(
                          'name', e.name,
                          'muscle_group', e.muscle_group,
                          'target_sets', re.target_sets,
                          'target_reps_min', re.target_reps_min,
                          'target_reps_max', re.target_reps_max
                        ) order by re.position), '[]'::jsonb)
                   from public.routine_exercises re
                   join public.exercises e on e.id = re.exercise_id
                  where re.routine_id = r.id
               )
             ) order by r.position), '[]'::jsonb)
        from public.routines r
       where r.project_id = v_project.id and r.archived_at is null
    )
  );
end;
$$;

comment on function public.get_member_active_project(uuid) is
  'Projeto ativo do perfil (nulo = o seu) para quem pode ver o histórico de treinos; sem cargas nem observações. Nulo sem projeto ativo. Erros: GS004, GS006.';

revoke execute on function public.get_member_active_project(uuid) from public, anon;
grant execute on function public.get_member_active_project(uuid) to authenticated;
