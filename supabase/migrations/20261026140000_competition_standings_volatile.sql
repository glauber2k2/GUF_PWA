-- =====================================================================
-- GUF APP · Competição: classificação paginada voltava erro no app ("Não foi possível carregar").
--
-- Causa: as funções de 20261026130000 foram marcadas STABLE. O PostgREST executa funções STABLE numa
-- transação SOMENTE LEITURA, mas a classificação passa por get_competition_participants(), que chama
-- ensure_social_profile() e pode gravar o perfil social de quem ainda não tem (INSERT) → erro 25006.
-- Correção: as funções que passam pelos participantes ficam VOLATILE (transação de leitura e escrita),
-- como a própria get_competition_participants. A regra e o resultado não mudam.
-- get_competition_series não passa pelos participantes e continua STABLE.
-- =====================================================================

alter function public.competition_standings(date, date, text) volatile;
alter function public.get_competition_standings(date, date, text, integer, integer) volatile;
alter function public.get_competition_standings_near_me(date, date, text, integer) volatile;
alter function public.get_competition_standings_of(date, date, text, uuid[]) volatile;
