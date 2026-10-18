"use client";

import { useSearchParams } from "next/navigation";
import type { SocialMockScenario } from "@/mocks/social";
import type { CompetitionMockScenario } from "@/mocks/competition";

export interface DevSocialState {
  /** Cenário dos mocks; null = dados reais. */
  scenario: SocialMockScenario | null;
  competitionScenario: CompetitionMockScenario | null;
  forceLoading: boolean;
  forceOffline: boolean;
}

const NONE: DevSocialState = { scenario: null, competitionScenario: null, forceLoading: false, forceOffline: false };
const SOCIAL_SCENARIOS: SocialMockScenario[] = ["padrao", "vazio", "erro"];
const COMPETITION_SCENARIOS: CompetitionMockScenario[] = ["padrao", "vazio", "erro", "lider"];

/**
 * ?estado= do Perfil social, seguidores, busca e Competição — SÓ EM DESENVOLVIMENTO (eliminado do
 * build de produção). Ex.: /perfil?estado=padrao · /pessoa?u=marina.lift&estado=padrao ·
 * /competicao?estado=lider · ?estado=vazio · ?estado=erro · ?estado=carregando · ?estado=offline.
 */
export function useDevSocialState(): DevSocialState {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;

  const values = (searchParams.get("estado") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0) return NONE;

  return {
    scenario: SOCIAL_SCENARIOS.find((v) => values.includes(v)) ?? "padrao",
    competitionScenario: COMPETITION_SCENARIOS.find((v) => values.includes(v)) ?? "padrao",
    forceLoading: values.includes("carregando"),
    forceOffline: values.includes("offline"),
  };
}
