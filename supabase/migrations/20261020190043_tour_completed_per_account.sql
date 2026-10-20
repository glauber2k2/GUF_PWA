-- =====================================================================
-- GUF APP · Tour de onboarding concluído por conta
--
-- Antes a conclusão do tour ficava só no aparelho (localStorage): quem trocava de
-- navegador ou celular via o tutorial de novo. Agora vale para a conta: guarda a
-- versão do tour que a pessoa concluiu ou pulou (o app compara com a versão atual;
-- um tour novo aparece de novo para todos). Nulo = nunca concluiu.
--
-- Gravação pelo próprio usuário (política "perfil: editar o próprio" já cobre).
-- =====================================================================

alter table public.profiles
  add column tour_completed_version smallint check (tour_completed_version > 0);

comment on column public.profiles.tour_completed_version is
  'Versão do tour de onboarding que o usuário concluiu ou pulou (nulo = nunca). Comparada com a versão atual do app.';

-- Quem já tem treino concluído já conhece o app: não mostrar o tour atual (v2) de novo.
-- Continua podendo rever em Configurações.
update public.profiles p
   set tour_completed_version = 2
 where exists (
   select 1 from public.workout_sessions ws
    where ws.user_id = p.id and ws.status = 'completed'
 );
