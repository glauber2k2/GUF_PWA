"use client";

import { useSearchParams } from "next/navigation";
import type { MeasurementsMockScenario } from "@/mocks/body-measurements";

export interface DevMeasurementsState {
  /** Cenário do mock; null = dados reais. */
  scenario: MeasurementsMockScenario | null;
  forceLoading: boolean;
  forceOffline: boolean;
}

const NONE: DevMeasurementsState = { scenario: null, forceLoading: false, forceOffline: false };
const SCENARIOS: MeasurementsMockScenario[] = ["padrao", "vazio", "sem-consentimento", "erro"];

/**
 * ?estado= das Medidas corporais — SÓ EM DESENVOLVIMENTO (eliminado do build de produção).
 * Ex.: /medidas?estado=padrao · ?estado=vazio · ?estado=sem-consentimento · ?estado=erro ·
 * ?estado=carregando · ?estado=offline (combináveis; o /perfil?estado=padrao também usa o mock).
 */
export function useDevMeasurementsState(): DevMeasurementsState {
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
  };
}
