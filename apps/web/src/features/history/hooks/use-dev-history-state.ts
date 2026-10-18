"use client";

import { useSearchParams } from "next/navigation";
import type { HistoryMockScenario } from "@/mocks/history";

export interface DevHistoryState {
  /** Cenário do mock; null = dados reais. */
  scenario: HistoryMockScenario | null;
  forceLoading: boolean;
  forceOffline: boolean;
  /** Abre a folha do dia treinado mais recente. */
  openDay: boolean;
}

const NONE: DevHistoryState = { scenario: null, forceLoading: false, forceOffline: false, openDay: false };
const SCENARIOS: HistoryMockScenario[] = ["padrao", "risco", "recorde", "novo", "poucos", "erro"];

/**
 * ?estado= do Histórico — SÓ EM DESENVOLVIMENTO (eliminado do build de produção).
 * Lista separada por vírgula, ex.: /historico?estado=risco,dia ou ?estado=carregando.
 * "dia" e "offline" sozinhos usam o cenário padrão do mock.
 */
export function useDevHistoryState(): DevHistoryState {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;

  const values = (searchParams.get("estado") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0) return NONE;

  const openDay = values.includes("dia");
  const forceOffline = values.includes("offline");
  const scenario = SCENARIOS.find((v) => values.includes(v)) ?? (openDay || forceOffline ? "padrao" : null);
  return { scenario, forceLoading: values.includes("carregando"), forceOffline, openDay };
}
