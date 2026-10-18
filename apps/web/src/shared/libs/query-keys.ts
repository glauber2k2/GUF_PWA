import type { QueryClient } from "@tanstack/react-query";

/** Prefixos das chaves do TanStack Query compartilhados entre telas. */
export const HOME_SUMMARY_KEY = "home-summary";
export const HISTORY_KEY = "history";
export const PROJECTS_KEY = "projects";
/** Resumo de treinos, evolução por exercício e busca de exercícios feitos. */
export const EVOLUTION_KEY = "evolution";

/** Um treino foi finalizado/descartado/excluído: Início, Histórico, resumos e evolução precisam recarregar. */
export function invalidateTrainingData(queryClient: QueryClient, options?: { refetchType?: "active" | "none" }): Promise<unknown> {
  return Promise.all(
    [HOME_SUMMARY_KEY, HISTORY_KEY, EVOLUTION_KEY].map((key) => queryClient.invalidateQueries({ queryKey: [key], refetchType: options?.refetchType })),
  );
}

/** Projetos/rotinas mudaram: a lista e a Início (projeto ativo, rotina sugerida) recarregam. */
export function invalidatePlanningData(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] }),
    queryClient.invalidateQueries({ queryKey: [HOME_SUMMARY_KEY] }),
  ]);
}

export const PROFILE_KEY = "profile";

export const LEGAL_OVERVIEW_KEY = "legal-overview";

/** Perfil mudou (nome, unidade, meta): Perfil, Início e Histórico (unidade e meta aparecem lá) recarregam. */
export function invalidateProfileData(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] }),
    queryClient.invalidateQueries({ queryKey: [HOME_SUMMARY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [HISTORY_KEY] }),
    // Revogar o consentimento de saúde muda o status no leitor de documentos.
    queryClient.invalidateQueries({ queryKey: [LEGAL_OVERVIEW_KEY] }),
  ]);
}
