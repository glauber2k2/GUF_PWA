-- =====================================================================
-- GUF APP · Migration 3 · Segurança por linha (RLS)
-- Regra geral: cada usuário só enxerga e altera os próprios dados.
-- (select auth.uid()) é usado no lugar de auth.uid() por desempenho.
-- =====================================================================

alter table public.profiles           enable row level security;
alter table public.exercises          enable row level security;
alter table public.projects           enable row level security;
alter table public.routines           enable row level security;
alter table public.routine_exercises  enable row level security;
alter table public.workout_sessions   enable row level security;
alter table public.session_exercises  enable row level security;
alter table public.set_logs           enable row level security;
alter table public.body_measurements  enable row level security;
alter table public.measurement_values enable row level security;
alter table public.legal_documents    enable row level security;
alter table public.consent_records    enable row level security;

-- ---------------------------------------------------------------------
-- PERFIL · criado por gatilho (migration 4); usuário lê e edita o próprio
-- ---------------------------------------------------------------------
create policy "perfil: ler o próprio" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "perfil: editar o próprio" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- EXERCÍCIOS · vê globais + próprios; altera só os próprios
-- ---------------------------------------------------------------------
create policy "exercícios: ver globais e próprios" on public.exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "exercícios: criar próprios" on public.exercises
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "exercícios: editar próprios" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "exercícios: apagar próprios" on public.exercises
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- PROJETOS
-- ---------------------------------------------------------------------
create policy "projetos: acesso total aos próprios" on public.projects
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- ROTINAS · o projeto vinculado também precisa ser do usuário
-- ---------------------------------------------------------------------
create policy "rotinas: acesso total às próprias" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (project_id is null or exists (
      select 1 from public.projects p
       where p.id = project_id and p.user_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------
-- EXERCÍCIOS DA ROTINA · user_id vem do gatilho (dono da rotina);
-- o exercício precisa ser global ou do próprio usuário
-- ---------------------------------------------------------------------
create policy "exercícios da rotina: acesso total aos próprios" on public.routine_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.exercises e
       where e.id = exercise_id
         and (e.user_id is null or e.user_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------
-- SESSÕES DE TREINO · a rotina vinculada também precisa ser do usuário
-- ---------------------------------------------------------------------
create policy "treinos: acesso total aos próprios" on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (routine_id is null or exists (
      select 1 from public.routines r
       where r.id = routine_id and r.user_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------
-- EXERCÍCIOS DA SESSÃO
-- ---------------------------------------------------------------------
create policy "exercícios do treino: acesso total aos próprios" on public.session_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.exercises e
       where e.id = exercise_id
         and (e.user_id is null or e.user_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------------
-- SÉRIES · todos os vínculos vêm do gatilho
-- ---------------------------------------------------------------------
create policy "séries: acesso total às próprias" on public.set_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- MEDIDAS CORPORAIS · gravar/editar exige consentimento de saúde ativo
-- Ler e apagar continuam permitidos (direito de acesso e de exclusão).
-- ---------------------------------------------------------------------
create policy "medidas: ler as próprias" on public.body_measurements
  for select to authenticated using (user_id = (select auth.uid()));

create policy "medidas: criar com consentimento" on public.body_measurements
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_health_consent()));

create policy "medidas: editar com consentimento" on public.body_measurements
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.has_health_consent()));

create policy "medidas: apagar as próprias" on public.body_measurements
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "valores de medidas: ler os próprios" on public.measurement_values
  for select to authenticated using (user_id = (select auth.uid()));

create policy "valores de medidas: criar com consentimento" on public.measurement_values
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_health_consent()));

create policy "valores de medidas: editar com consentimento" on public.measurement_values
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.has_health_consent()));

create policy "valores de medidas: apagar os próprios" on public.measurement_values
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- DOCUMENTOS LEGAIS · leitura pública (inclusive antes do login);
-- cadastro apenas pelo administrador (sem política de escrita)
-- ---------------------------------------------------------------------
create policy "documentos legais: leitura pública" on public.legal_documents
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------
-- CONSENTIMENTOS · usuário lê e inclui os próprios; nunca edita nem apaga
-- ---------------------------------------------------------------------
create policy "consentimentos: ler os próprios" on public.consent_records
  for select to authenticated using (user_id = (select auth.uid()));

create policy "consentimentos: incluir os próprios" on public.consent_records
  for insert to authenticated with check (user_id = (select auth.uid()));
