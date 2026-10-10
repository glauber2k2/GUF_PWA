"use client";

import { useSearchParams } from "next/navigation";
import {
  DEFAULT_HOME_SCENARIO,
  type HomeMockScenario,
  type StreakScenario,
  type TodayScenario,
} from "@/mocks/home";

export interface DevHomeState {
  /** Cenário do mock; null = padrão. */
  scenario: HomeMockScenario | null;
  forceLoading: boolean;
  forceOffline: boolean;
}

const NONE: DevHomeState = { scenario: null, forceLoading: false, forceOffline: false };

const TODAY_VALUES: TodayScenario[] = ["planejado", "vazio", "novo", "concluido", "andamento"];
const STREAK_VALUES: StreakScenario[] = ["ativa", "recorde", "risco", "zerada"];

/**
 * ?estado= para visualizar os estados do design — SÓ EM DESENVOLVIMENTO.
 * Aceita uma lista separada por vírgula, ex.: /?estado=concluido,risco ou /?estado=carregando.
 * No build de produção a leitura do parâmetro é eliminada (NODE_ENV é constante no build).
 */
export function useDevHomeState(): DevHomeState {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;

  const values = (searchParams.get("estado") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0) return NONE;

  const today = TODAY_VALUES.find((v) => values.includes(v));
  const streak = STREAK_VALUES.find((v) => values.includes(v));
  return {
    scenario: today || streak ? { ...DEFAULT_HOME_SCENARIO, ...(today && { today }), ...(streak && { streak }) } : null,
    forceLoading: values.includes("carregando"),
    forceOffline: values.includes("offline"),
  };
}
