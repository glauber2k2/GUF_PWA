-- =====================================================================
-- GUF APP · O treino existe, mas está fora do histórico do plano?
--
-- Com o histórico devolvido pela janela do plano (plan_history_window), um resumo antigo aberto por
-- link volta como "não encontrado". Esta função responde só sim/não para um treino da PRÓPRIA pessoa,
-- para o app mostrar "Isso faz parte do Pro" em vez de "treino não encontrado". Não devolve dados do treino.
-- =====================================================================

create or replace function public.is_session_hidden_by_plan(p_session_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workout_sessions ws
     where ws.id = p_session_id
       and ws.user_id = (select auth.uid())
       and ws.status = 'completed'
       and ws.performed_on < (select public.history_visible_from())
  );
$$;

revoke execute on function public.is_session_hidden_by_plan(uuid) from public, anon;
grant execute on function public.is_session_hidden_by_plan(uuid) to authenticated;
