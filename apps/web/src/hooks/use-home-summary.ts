"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { currentWeek, toLocalISODate } from "@guf/core";
import { getSupabaseClient } from "@/lib/supabase";
// Trocar por "@guf/api" na integração com o Supabase (mesma assinatura).
import { getHomeSummary, setHomeMockScenario, startWorkout } from "@/mocks/home";
import { useAuth } from "@/providers/auth-provider";
import { useDevHomeState } from "./use-dev-home-state";

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
    queryKey: ["home-summary", user?.id, today, dev.scenario],
    enabled: Boolean(user),
    queryFn: async () => {
      if (process.env.NODE_ENV === "development" && dev.scenario) setHomeMockScenario(dev.scenario);
      const { data, error } = await getHomeSummary(getSupabaseClient(), { today, weekStart, weekEnd });
      if (error) throw error;
      return data;
    },
  });
}

/** Inicia um treino (rotina ou vazio) com performed_on na data LOCAL. */
export function useStartWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (routineId: string | null) => {
      const { data, error } = await startWorkout(getSupabaseClient(), {
        routineId,
        performedOn: toLocalISODate(new Date()),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["home-summary"] }),
  });
}
