"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  evolutionApi,
  isNetworkError,
  type ApiError,
  type ApiResult,
  type EvolutionApi,
  type ExerciseEvolution,
  type TrainedExercise,
  type WorkoutSummaryDetail,
} from "@guf/api";
import { withDeviceCache, type CachedResult } from "@/lib/offline/device-cache";
import { offlineDb } from "@/lib/offline/db";
import { pendingWorkoutSummary } from "@/lib/offline/local-summary";
import { hasPendingFor } from "@/lib/offline/outbox";
import { EVOLUTION_KEY, invalidateTrainingData } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { mockEvolutionApi, setEvolutionMockScenario } from "@/mocks/evolution";
import { useAuth } from "@/providers/auth-provider";
import { useDevEvolutionState, type DevEvolutionState } from "./use-dev-evolution-state";

/** Dados reais por padrão (com cópia no aparelho); em DESENVOLVIMENTO com ?estado=, o mock (mesmo contrato). */
export function useEvolutionSource(): { api: EvolutionApi; dev: DevEvolutionState; mock: boolean } {
  const dev = useDevEvolutionState();
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setEvolutionMockScenario(dev.scenario);
    return { api: mockEvolutionApi, dev, mock: true };
  }
  return { api: evolutionApi, dev, mock: false };
}

/** Origem do resumo: servidor, cópia salva no aparelho ou treino finalizado offline ainda não enviado. */
export type SummarySource = CachedResult<unknown>["source"] | "pending";

/** Consulta com cópia no aparelho (dados reais) e erro lançado para o TanStack Query. */
async function cachedOrThrow<T>(cacheKey: string, mock: boolean, fetcher: () => Promise<ApiResult<T>>): Promise<CachedResult<T>> {
  if (mock) {
    const res = await fetcher();
    if (res.error) throw res.error;
    return { value: res.data, source: "network" };
  }
  const res = await withDeviceCache(cacheKey, fetcher);
  if (res.error) throw res.error;
  return res.data;
}

/** Resumo de um treino concluído (abre sem internet com a última cópia ou o cálculo do aparelho). */
export function useWorkoutSummary(sessionId: string | null) {
  const { user } = useAuth();
  const { api, dev, mock } = useEvolutionSource();
  return useQuery<{ value: WorkoutSummaryDetail; source: SummarySource }, ApiError>({
    queryKey: [EVOLUTION_KEY, "summary", user?.id, sessionId, dev.scenario],
    enabled: Boolean(user && (sessionId || mock)),
    queryFn: async () => {
      const id = sessionId ?? "";
      try {
        return await cachedOrThrow(`summary:${id}`, mock, () => api.getWorkoutSummary(getSupabaseClient(), { sessionId: id }));
      } catch (error) {
        // Finalizado sem internet e ainda não enviado: o servidor não conhece o treino como concluído.
        const e = error as ApiError;
        if (!mock && (isNetworkError(e) || e.code === "session_not_found")) {
          const local = await pendingWorkoutSummary(id);
          if (local) return { value: local, source: "pending" };
        }
        throw e;
      }
    },
  });
}

/** Evolução de um exercício (todos os treinos; o período é filtrado na tela). */
export function useExerciseEvolution(exerciseId: string | null) {
  const { user } = useAuth();
  const { api, dev, mock } = useEvolutionSource();
  return useQuery<CachedResult<ExerciseEvolution>, ApiError>({
    queryKey: [EVOLUTION_KEY, "exercise", user?.id, exerciseId, dev.scenario],
    enabled: Boolean(user && (exerciseId || mock)),
    queryFn: () => cachedOrThrow(`exercise:${exerciseId ?? ""}`, mock, () => api.getExerciseEvolution(getSupabaseClient(), { exerciseId: exerciseId ?? "" })),
  });
}

/** Exercícios que o usuário já fez (busca do Histórico). */
export function useTrainedExercises() {
  const { user } = useAuth();
  const { api, dev, mock } = useEvolutionSource();
  return useQuery<CachedResult<TrainedExercise[]>, ApiError>({
    queryKey: [EVOLUTION_KEY, "trained", user?.id, dev.scenario],
    enabled: Boolean(user),
    queryFn: () => cachedOrThrow("trained-exercises", mock, () => api.listTrainedExercises(getSupabaseClient())),
  });
}

/** Mensagem quando o treino ainda tem gravações na fila do aparelho. */
const STILL_SYNCING: ApiError = {
  code: "network_error",
  message: "Este treino ainda está sendo enviado. Conecte-se à internet, aguarde o envio e tente excluir de novo.",
};

/** Exclui um treino concluído; Início, Histórico, resumos e evolução recarregam. */
export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  const { api, mock } = useEvolutionSource();
  return useMutation<null, ApiError, string>({
    mutationFn: async (sessionId) => {
      if (!mock && (await hasPendingFor(sessionId))) throw STILL_SYNCING;
      const { error } = await api.deleteWorkout(getSupabaseClient(), { sessionId });
      if (error) throw error;
      return null;
    },
    onSuccess: async (_data, sessionId) => {
      // A cópia salva no aparelho não pode reabrir um treino excluído.
      await offlineDb().history.delete(`summary:${sessionId}`);
      // Resumos guardados dos outros treinos do dia têm a contagem antiga ("1/2"): descarta (só os fora da tela).
      queryClient.removeQueries({ queryKey: [EVOLUTION_KEY, "summary"], predicate: (q) => q.getObserversCount() === 0 });
      // Não recarrega a tela atual (o treino não existe mais); as outras telas recarregam ao abrir.
      await invalidateTrainingData(queryClient, { refetchType: "none" });
    },
  });
}
