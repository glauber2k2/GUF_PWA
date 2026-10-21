"use client";

import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { workoutEditApi, type ApiError, type EditableWorkout, type WorkoutEditApi, type WorkoutEditInput } from "@guf/api";
import { offlineDb } from "@/shared/offline/db";
import { invalidateTrainingData } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockWorkoutEditApi } from "@/mocks/workout-edit";

const WORKOUT_EDIT_KEY = "workout-edit";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado= (vindo do resumo), o mock (mesmo contrato). */
export function useWorkoutEditSource(): { api: WorkoutEditApi; mock: boolean } {
  const scenario = useSearchParams().get("estado");
  if (process.env.NODE_ENV === "development" && scenario) return { api: mockWorkoutEditApi, mock: true };
  return { api: workoutEditApi, mock: false };
}

/** Treino concluído para editar; sempre do servidor (sem cópia no aparelho: editar exige internet). */
export function useEditableWorkout(sessionId: string | null) {
  const { api, mock } = useWorkoutEditSource();
  return useQuery<EditableWorkout, ApiError>({
    // Sem o id do usuário na chave (auth importa esta feature): gcTime 0 não deixa nada para a próxima conta.
    queryKey: [WORKOUT_EDIT_KEY, sessionId, mock],
    enabled: Boolean(sessionId),
    // Cada abertura parte do que está no servidor (outra edição ou outro aparelho podem ter mudado).
    staleTime: 0,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await api.getEditableWorkout(getSupabaseClient(), { sessionId: sessionId ?? "" });
      if (error) throw error;
      return data;
    },
  });
}

/** Salva a edição de uma vez; resumo, Início, Histórico, evolução e competição recarregam. */
export function useSaveWorkoutEdit() {
  const queryClient = useQueryClient();
  const { api } = useWorkoutEditSource();
  return useMutation<null, ApiError, WorkoutEditInput>({
    mutationFn: async (input) => {
      const { error } = await api.saveWorkoutEdit(getSupabaseClient(), input);
      if (error) throw error;
      return null;
    },
    onSuccess: async (_data, input) => {
      // A cópia do resumo guardada no aparelho mostraria o treino antes da edição.
      await offlineDb().history.delete(`summary:${input.sessionId}`);
      await invalidateTrainingData(queryClient);
    },
  });
}
