-- =====================================================================
-- GUF APP · get_streak() volta a funcionar para o app
-- A migration social_competition passou a regra para streak_for(usuário), que não é
-- liberada para o app (leria a sequência de qualquer pessoa). get_streak() rodava com a
-- permissão do usuário e falhava. Agora roda como definer, sempre com o próprio auth.uid().
-- Mesmo contrato e mesmo retorno.
-- (A migration 20261018175451_get_streak_security_definer foi registrada vazia por um
-- comando interrompido; esta é a correção de fato.)
-- =====================================================================

create or replace function public.get_streak()
returns table (
  current_streak      integer,
  best_streak         integer,
  current_week_count  integer,
  week_secured        boolean,
  streak_at_risk      boolean
)
language sql stable security definer
set search_path = ''
as $$
  select * from public.streak_for((select auth.uid()));
$$;

revoke execute on function public.get_streak() from public, anon;
grant execute on function public.get_streak() to authenticated;
