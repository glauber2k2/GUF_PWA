"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { STANDINGS_NEAR_RADIUS, type CompetitionRange } from "@guf/core";
import { competitionApi, type ApiError, type CompetitionApi, type StandingsQuery } from "@guf/api";
import { COMPETITION_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockCompetitionApi, setCompetitionMockScenario } from "@/mocks/competition";
import { useAuth } from "@/features/auth";
import { useDevSocialState, type DevSocialState } from "@/features/social";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (mesmo contrato). */
export function useCompetitionSource(): { api: CompetitionApi; dev: DevSocialState } {
  const dev = useDevSocialState();
  if (process.env.NODE_ENV === "development" && dev.competitionScenario) {
    setCompetitionMockScenario(dev.competitionScenario);
    return { api: mockCompetitionApi, dev };
  }
  return { api: competitionApi, dev };
}

const SEASON_PODIUM_STALE_MS = 60 * 60 * 1000;

function unwrap<T>(result: { data: T; error: null } | { data: null; error: ApiError }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

/** Chave e permissão comuns às consultas da classificação (mesma pessoa, período e métrica). */
function useStandingsBase(query: StandingsQuery) {
  const { user } = useAuth();
  const { api, dev } = useCompetitionSource();
  return {
    api,
    key: [COMPETITION_KEY, "standings", user?.id, query.from, query.to, query.metric, dev.competitionScenario] as const,
    enabled: Boolean(user) || dev.competitionScenario !== null,
  };
}

/** Uma página da classificação (o banco ordena e pagina); com isActive = false, espera (ex.: folha fechada). */
export function useCompetitionStandings(query: StandingsQuery, page: number, isActive = true) {
  const { api, key, enabled } = useStandingsBase(query);
  return useQuery({
    queryKey: [...key, "page", page],
    enabled: enabled && isActive,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getCompetitionStandings(getSupabaseClient(), { ...query, page })),
  });
}

/** Você e as posições vizinhas (cartão "Sua posição" e adversário padrão). */
export function useStandingsNearMe(query: StandingsQuery, isActive = true) {
  const { api, key, enabled } = useStandingsBase(query);
  return useQuery({
    queryKey: [...key, "near-me"],
    enabled: enabled && isActive,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getStandingsNearMe(getSupabaseClient(), { ...query, radius: STANDINGS_NEAR_RADIUS })),
  });
}

/** Pessoas específicas na classificação geral (adversário fora da página, duelo). */
export function useStandingsOf(query: StandingsQuery, userIds: string[]) {
  const { api, key, enabled } = useStandingsBase(query);
  return useQuery({
    queryKey: [...key, "of", ...userIds],
    enabled: enabled && userIds.length > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getStandingsOf(getSupabaseClient(), { ...query, userIds })),
  });
}

/** Adversários para o duelo: busca e página feitas no banco (5 por vez). */
export function useRivalSearch(query: StandingsQuery, search: string, page: number, enabled: boolean) {
  const { api, key, enabled: canQuery } = useStandingsBase(query);
  return useQuery({
    queryKey: [...key, "rivals", search, page],
    enabled: canQuery && enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.searchRivals(getSupabaseClient(), { ...query, search, page })),
  });
}

/** Semanas e dias só das pessoas do gráfico ou do duelo. */
export function useCompetitionSeries(range: CompetitionRange, userIds: string[]) {
  const { user } = useAuth();
  const { api, dev } = useCompetitionSource();
  return useQuery({
    queryKey: [COMPETITION_KEY, "series", user?.id, range.from, range.to, dev.competitionScenario, ...userIds],
    enabled: (Boolean(user) || dev.competitionScenario !== null) && userIds.length > 0,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getCompetitionSeries(getSupabaseClient(), { ...range, userIds })),
  });
}

/**
 * Pódio final da temporada encerrada: o servidor só devolve nos 3 primeiros dias da temporada atual
 * (null fora disso). Vale por 1 hora; depois, abrir a tela ou voltar ao app consulta de novo e o
 * pódio normal volta quando a janela acaba.
 */
export function useSeasonPodium(isActive: boolean) {
  const { user } = useAuth();
  const { api, dev } = useCompetitionSource();
  return useQuery({
    queryKey: [COMPETITION_KEY, "season-podium", user?.id, dev.competitionScenario],
    enabled: isActive && (Boolean(user) || dev.competitionScenario !== null),
    staleTime: SEASON_PODIUM_STALE_MS,
    queryFn: async () => unwrap(await api.getSeasonPodium(getSupabaseClient())),
  });
}

/** Regras públicas da pontuação vigentes na temporada. */
export function useCompetitionParameters(season: string) {
  const { user } = useAuth();
  const { api, dev } = useCompetitionSource();
  return useQuery({
    queryKey: [COMPETITION_KEY, "parameters", season, dev.competitionScenario],
    enabled: Boolean(user) || dev.competitionScenario !== null,
    staleTime: Infinity,
    queryFn: async () => unwrap(await api.getCompetitionParameters(getSupabaseClient(), season)),
  });
}

/** Extrato dos seus pontos no período (semanas com as partes e os treinos). */
export function usePointsStatement(range: CompetitionRange, isActive = true) {
  const { user } = useAuth();
  const { api, dev } = useCompetitionSource();
  return useQuery({
    queryKey: [COMPETITION_KEY, "statement", user?.id, range.from, range.to, dev.competitionScenario],
    enabled: isActive && (Boolean(user) || dev.competitionScenario !== null),
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getPointsStatement(getSupabaseClient(), range)),
  });
}
