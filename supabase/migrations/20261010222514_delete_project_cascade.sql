-- =====================================================================
-- GUF APP · Excluir projeto leva junto as rotinas dele
--
-- Regra: não existe rotina avulsa (toda rotina pertence a um projeto). Antes, excluir um
-- projeto deixava as rotinas com project_id nulo. Agora a exclusão apaga as rotinas do projeto
-- (e os exercícios planejados delas) na mesma operação.
--
-- Histórico preservado: workout_sessions.routine_id continua "on delete set null" — o treino
-- feito guarda o nome da rotina e segue no histórico, só perde o vínculo.
-- O projeto Favoritos continua protegido pelo gatilho protect_favorites_project (erro GP002).
-- =====================================================================

alter table public.routines
  drop constraint routines_project_id_fkey,
  add constraint routines_project_id_fkey
    foreign key (project_id) references public.projects (id) on delete cascade;
