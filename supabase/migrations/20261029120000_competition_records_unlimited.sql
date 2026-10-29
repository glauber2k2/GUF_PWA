-- =====================================================================
-- GUF APP · Competição: recordes sem teto, 3 pontos cada
--
-- Antes: 5 pontos por recorde batido na semana, até 25 (5 recordes).
-- Agora: 3 pontos por recorde, sem limite na semana. Menos pontos por recorde equilibram o fim do
-- teto: constância (15 por dia) continua sendo o que mais pesa.
--
-- Decisão de produto (2026-10-29): vale já, para todas as semanas (os pontos são recalculados a cada
-- consulta). Por isso a linha publicada é corrigida aqui, com o gatilho de proteção desligado só
-- durante esta migration (o app e o painel continuam sem poder alterar os parâmetros).
-- records_max nulo = sem teto: competition_week_scores usa least(records_max, …), e o least do
-- Postgres ignora nulos, então a função não muda.
-- =====================================================================

alter table public.competition_parameters
  alter column records_max drop not null;

comment on column public.competition_parameters.records_max is
  'Teto de pontos de recordes na semana; nulo = sem teto (desde 2026-10-29).';

alter table public.competition_parameters disable trigger competition_parameters_guard;

update public.competition_parameters
   set record_points = 3,
       records_max = null;

alter table public.competition_parameters enable trigger competition_parameters_guard;
