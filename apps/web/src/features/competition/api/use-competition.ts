"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { CompetitionRange } from "@guf/core";
import { competitionApi, type ApiError, type CompetitionApi } from "@guf/api";
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

function unwrap<T>(result: { data: T; error: null } | { data: null; error: ApiError }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

export function useCompetitionBoard(range: CompetitionRange) {
  const { user } = useAuth();
  const { api, dev } = useCompetitionSource();
  return useQuery({
    queryKey: [COMPETITION_KEY, "board", user?.id, range.from, range.to, dev.competitionScenario],
    enabled: Boolean(user) || dev.competitionScenario !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getCompetitionBoard(getSupabaseClient(), range)),
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
export function usePointsStatement(range: CompetitionRange) {
  const { user } = useAuth();
  const { api, dev } = useCompetitionSource();
  return useQuery({
    queryKey: [COMPETITION_KEY, "statement", user?.id, range.from, range.to, dev.competitionScenario],
    enabled: Boolean(user) || dev.competitionScenario !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getPointsStatement(getSupabaseClient(), range)),
  });
}
