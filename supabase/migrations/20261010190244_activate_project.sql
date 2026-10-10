-- =====================================================================
-- GUF APP · Ativar projeto de forma atômica
--
-- Regra: no máximo UM projeto ativo por usuário (índice único projects_one_active_per_user).
-- Trocar o ativo pelo app em duas gravações (desativar o atual, ativar o novo) pode falhar
-- no meio e deixar o usuário sem projeto ativo, ou esbarrar no índice único. Esta função faz a
-- troca numa única transação.
--
-- Erro próprio GP001 ("projeto não encontrado"): não reutiliza P0002/23505, que o app já
-- traduz como "treino não encontrado" / "treino em andamento".
-- =====================================================================

create or replace function public.activate_project(p_project_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  -- Projeto do próprio usuário e não arquivado (RLS também garante o dono).
  if not exists (
    select 1 from public.projects
     where id = p_project_id and user_id = v_uid and archived_at is null
  ) then
    raise exception 'Projeto não encontrado ou arquivado' using errcode = 'GP001';
  end if;

  -- Trava os projetos do usuário: duas ativações simultâneas acontecem uma depois da outra.
  perform 1 from public.projects where user_id = v_uid for update;

  -- Desativa o atual antes de ativar o novo (o índice único não é adiável).
  update public.projects
     set is_active = false
   where user_id = v_uid and is_active and id <> p_project_id;

  update public.projects
     set is_active = true
   where id = p_project_id and not is_active;
end;
$$;

comment on function public.activate_project(uuid) is
  'Ativa o projeto informado e desativa o anterior na mesma transação (um projeto ativo por usuário). Erro GP001: projeto não encontrado ou arquivado.';

-- ---------------------------------------------------------------------
-- PERMISSÕES: só usuários logados.
-- ---------------------------------------------------------------------
revoke execute on function public.activate_project(uuid) from public, anon;
grant execute on function public.activate_project(uuid) to authenticated;
