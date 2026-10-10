import type { QueryClient } from "@tanstack/react-query";

/** Prefixos das chaves do TanStack Query compartilhados entre telas. */
export const HOME_SUMMARY_KEY = "home-summary";
export const HISTORY_KEY = "history";

/** Um treino foi finalizado/descartado: Início e Histórico precisam recarregar. */
export function invalidateTrainingData(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: [HOME_SUMMARY_KEY] });
  void queryClient.invalidateQueries({ queryKey: [HISTORY_KEY] });
}
