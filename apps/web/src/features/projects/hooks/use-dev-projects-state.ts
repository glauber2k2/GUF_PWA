"use client";

import { useSearchParams } from "next/navigation";
import type { ProjectsMockScenario } from "@/mocks/projects";

export interface DevProjectsState {
  /** Cenário do mock; null = dados reais. */
  scenario: ProjectsMockScenario | null;
  forceLoading: boolean;
  forceOffline: boolean;
  /** Gravações falham como queda de conexão (aviso "Tentar de novo" na folha). */
  dropOnSave: boolean;
}

const NONE: DevProjectsState = { scenario: null, forceLoading: false, forceOffline: false, dropOnSave: false };
const SCENARIOS: ProjectsMockScenario[] = ["padrao", "nenhum-ativo", "novo", "sem-rotinas", "erro"];

/**
 * ?estado= dos Projetos — SÓ EM DESENVOLVIMENTO (eliminado do build de produção).
 * Ex.: /projetos?estado=nenhum-ativo · ?estado=carregando · ?estado=offline · ?estado=queda.
 * "offline", "carregando" e "queda" sozinhos usam o cenário padrão do mock.
 */
export function useDevProjectsState(): DevProjectsState {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;

  const values = (searchParams.get("estado") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0) return NONE;

  const forceOffline = values.includes("offline");
  const forceLoading = values.includes("carregando");
  const dropOnSave = values.includes("queda");
  const scenario = SCENARIOS.find((v) => values.includes(v)) ?? (forceOffline || forceLoading || dropOnSave ? "padrao" : null);
  return { scenario, forceLoading, forceOffline, dropOnSave };
}
