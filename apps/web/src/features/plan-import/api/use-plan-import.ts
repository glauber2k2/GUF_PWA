"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { planImportApi, type ApiError, type PlanImportApi, type PlanImportDestination, type PlanImportDraft } from "@guf/api";
import { invalidatePlanningData } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockPlanImportApi, setPlanImportMockOptions } from "@/mocks/plan-import";
import { useProjectsSource } from "@/features/projects";
import { EXERCISE_LIBRARY_KEY } from "@/features/exercise-picker";

/**
 * Dados reais por padrão. Em DESENVOLVIMENTO, com os ?estado= de Projetos, o mock (mesma memória).
 * No build de produção o ramo do mock é eliminado (NODE_ENV é constante).
 */
export function usePlanImportSource(): { api: PlanImportApi } {
  const { dev } = useProjectsSource();
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setPlanImportMockOptions({ failConversion: dev.scenario === "erro" });
    return { api: mockPlanImportApi };
  }
  return { api: planImportApi };
}

/** Texto colado → rascunho (GUF AI; conta no limite diário). Nada é gravado. */
export function useConvertTrainingPlan() {
  const { api } = usePlanImportSource();
  return useMutation<PlanImportDraft, ApiError, string>({
    mutationFn: async (text) => {
      const { data, error } = await api.convertTrainingPlan(getSupabaseClient(), { text });
      if (error) throw error;
      return data;
    },
  });
}

/** Cria projeto, exercícios novos e rotinas de uma vez; depois recarrega Projetos, Início e a biblioteca. */
export function useImportTrainingPlan() {
  const { api } = usePlanImportSource();
  const queryClient = useQueryClient();
  return useMutation<{ projectId: string }, ApiError, { draft: PlanImportDraft; destination: PlanImportDestination }>({
    mutationFn: async (input) => {
      const { data, error } = await api.importTrainingPlan(getSupabaseClient(), input);
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidatePlanningData(queryClient),
        queryClient.invalidateQueries({ queryKey: [EXERCISE_LIBRARY_KEY] }),
      ]);
    },
  });
}
