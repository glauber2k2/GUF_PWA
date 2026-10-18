"use client";

import { useQuery } from "@tanstack/react-query";
import { routinesApi, type RoutinesApi } from "@guf/api";
import { PROJECTS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockRoutinesApi } from "@/mocks/routines";
import { useAuth } from "@/features/auth";
import { useProjectsSource } from "@/features/projects";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (mesma memória do mock de Projetos). */
export function useRoutinesSource(): { api: RoutinesApi; mock: boolean } {
  const { dev } = useProjectsSource();
  if (process.env.NODE_ENV === "development" && dev.scenario) return { api: mockRoutinesApi, mock: true };
  return { api: routinesApi, mock: false };
}

/** Rotina para edição; null = rotina nova (não busca). Chave sob Projetos: salvar recarrega tudo junto. */
export function useRoutine(routineId: string | null) {
  const { user } = useAuth();
  const { api, mock } = useRoutinesSource();
  return useQuery({
    queryKey: [PROJECTS_KEY, "routine", user?.id, routineId, mock],
    enabled: Boolean(user && routineId),
    // O rascunho é editado na tela: não recarregar sozinho por cima do que o usuário digitou.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await api.getRoutine(getSupabaseClient(), { routineId: routineId ?? "" });
      if (error) throw error;
      return data;
    },
  });
}
