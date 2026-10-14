"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getHomeSummary, startWorkout, type HomeApi } from "@guf/api";
import { currentWeek, toLocalISODate } from "@guf/core";
import { HOME_SUMMARY_KEY, invalidateTrainingData } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { mockHomeApi, setHomeMockScenario } from "@/mocks/home";
import { useAuth } from "@/providers/auth-provider";
import { useDevHomeState, type DevHomeState } from "./use-dev-home-state";

const realHomeApi: HomeApi = { getHomeSummary, startWorkout };

/**
 * Dados reais por padrão. Em DESENVOLVIMENTO, com ?estado= de dados, usa o mock
 * (mesmo contrato) para visualizar os estados do design. No build de produção
 * o ramo do mock é eliminado (NODE_ENV é constante).
 */
function homeApiFor(dev: DevHomeState): HomeApi {
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setHomeMockScenario(dev.scenario);
    return mockHomeApi;
  }
  return realHomeApi;
}

export { HOME_SUMMARY_KEY };

/** Dados da tela Início (datas sempre no fuso local do aparelho). */
export function useHomeSummary() {
  const { user } = useAuth();
  const dev = useDevHomeState();
  const now = new Date();
  const today = toLocalISODate(now);
  const week = currentWeek(now);
  const weekStart = week[0]?.iso ?? today;
  const weekEnd = week[6]?.iso ?? today;

  return useQuery({
    queryKey: [HOME_SUMMARY_KEY, user?.id, today, dev.scenario],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await homeApiFor(dev).getHomeSummary(getSupabaseClient(), { today, weekStart, weekEnd });
      if (error) throw error;
      return data;
    },
  });
}

/** Inicia um treino (rotina ou vazio) com performed_on na data LOCAL. */
export function useStartWorkout() {
  const queryClient = useQueryClient();
  const dev = useDevHomeState();
  return useMutation({
    mutationFn: async (routineId: string | null) => {
      const { data, error } = await homeApiFor(dev).startWorkout(getSupabaseClient(), {
        routineId,
        performedOn: toLocalISODate(new Date()),
      });
      if (error) throw error;
      return data;
    },
    // Atualiza a Início: o treino recém-criado aparece como "em andamento". Sem esperar a recarga
    // (devolver a promessa seguraria a abertura do treino até a Início recarregar).
    onSettled: () => {
      void invalidateTrainingData(queryClient);
    },
  });
}
