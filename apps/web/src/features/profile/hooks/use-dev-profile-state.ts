"use client";

import { useSearchParams } from "next/navigation";
import type { InstallPlatform } from "@guf/core";
import type { ProfileMockScenario } from "@/mocks/profile";

export interface DevProfileState {
  /** Cenário do mock; null = dados reais. */
  scenario: ProfileMockScenario | null;
  forceLoading: boolean;
  forceOffline: boolean;
  /** Simula alterações de treino pendentes na fila offline (confirmação ao sair). */
  forcePending: boolean;
  /** Usuário com foto (ícone do app como exemplo). */
  withPhoto: boolean;
  /** Simula a plataforma de instalação. */
  platform: InstallPlatform | null;
}

const NONE: DevProfileState = { scenario: null, forceLoading: false, forceOffline: false, forcePending: false, withPhoto: false, platform: null };
const SCENARIOS: ProfileMockScenario[] = ["padrao", "sem-saude", "erro"];
const PLATFORMS: Record<string, InstallPlatform> = {
  android: "android-prompt",
  "ios-safari": "ios-safari",
  "ios-outro": "ios-other-browser",
  instalado: "installed",
  desconhecido: "unsupported",
};

/**
 * ?estado= do Perfil — SÓ EM DESENVOLVIMENTO (eliminado do build de produção).
 * Ex.: /configuracoes?estado=ios-safari · ?estado=sem-saude,offline · ?estado=pendente · ?estado=foto · ?estado=carregando.
 * Flags sozinhas usam o cenário padrão do mock.
 */
export function useDevProfileState(): DevProfileState {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;

  const values = (searchParams.get("estado") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (values.length === 0) return NONE;

  const platformKey = Object.keys(PLATFORMS).find((k) => values.includes(k));
  return {
    scenario: SCENARIOS.find((v) => values.includes(v)) ?? "padrao",
    forceLoading: values.includes("carregando"),
    forceOffline: values.includes("offline"),
    forcePending: values.includes("pendente"),
    withPhoto: values.includes("foto"),
    platform: platformKey ? (PLATFORMS[platformKey] ?? null) : null,
  };
}
