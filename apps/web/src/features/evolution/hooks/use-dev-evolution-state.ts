"use client";

import { useSearchParams } from "next/navigation";
import type { EvolutionMockScenario } from "@/mocks/evolution";

export interface DevEvolutionState {
  /** Cenário do mock; null = dados reais. */
  scenario: EvolutionMockScenario | null;
  forceLoading: boolean;
  forceOffline: boolean;
  /** Abre o diálogo "Excluir este treino?" (resumo). */
  openDelete: boolean;
}

const NONE: DevEvolutionState = { scenario: null, forceLoading: false, forceOffline: false, openDelete: false };
const SCENARIOS: EvolutionMockScenario[] = ["padrao", "sem-recordes", "livre", "pausas", "nao-encontrado", "primeira-vez", "um-treino", "erro"];

/**
 * ?estado= do Resumo, da Evolução e da busca — SÓ EM DESENVOLVIMENTO (eliminado do build de produção).
 * Ex.: /treino/resumo?estado=pausas · ?estado=excluir · /exercicio?estado=primeira-vez · ?estado=offline.
 * "carregando", "offline" e "excluir" sozinhos usam o cenário padrão do mock.
 */
export function useDevEvolutionState(): DevEvolutionState {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;

  const values = (searchParams.get("estado") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0) return NONE;

  return {
    scenario: SCENARIOS.find((v) => values.includes(v)) ?? "padrao",
    forceLoading: values.includes("carregando"),
    forceOffline: values.includes("offline"),
    openDelete: values.includes("excluir"),
  };
}
