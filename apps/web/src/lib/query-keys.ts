import type { QueryClient } from "@tanstack/react-query";

/** Prefixos das chaves do TanStack Query compartilhados entre telas. */
export const HOME_SUMMARY_KEY = "home-summary";
export const HISTORY_KEY = "history";
export const PROJECTS_KEY = "projects";

/** Um treino foi finalizado/descartado: Início e Histórico precisam recarregar. */
export function invalidateTrainingData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: [HOME_SUMMARY_KEY] });
  void queryClient.invalidateQueries({ queryKey: [HISTORY_KEY] });
}

/** Projetos/rotinas mudaram: a lista e a Início (projeto ativo, rotina sugerida) recarregam. */
export function invalidatePlanningData(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [PROJECTS_KEY] }),
    queryClient.invalidateQueries({ queryKey: [HOME_SUMMARY_KEY] }),
  ]);
}
