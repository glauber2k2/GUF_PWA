"use client";

import { useSearchParams } from "next/navigation";
import type { StaffRole } from "@guf/core";

export type DevAccess = "ready" | "signed_out" | "not_staff" | "mfa_setup" | "mfa_challenge";

export interface DevAdminState {
  /** Papel simulado; null = dados reais. */
  role: StaffRole | null;
  access: DevAccess;
  forceLoading: boolean;
  forceError: boolean;
  empty: boolean;
}

const NONE: DevAdminState = { role: null, access: "ready", forceLoading: false, forceError: false, empty: false };

const ROLE_VALUES: Record<string, StaffRole> = { admin: "admin", suporte: "support", leitura: "viewer" };
const ACCESS_VALUES: Record<string, DevAccess> = {
  entrar: "signed_out",
  "sem-acesso": "not_staff",
  configurar: "mfa_setup",
  codigo: "mfa_challenge",
};

/**
 * ?estado= do painel — SÓ EM DESENVOLVIMENTO (eliminado do build de produção). Usa os mocks
 * (mesmo contrato da API). Ex.: /?estado=admin · suporte · leitura · entrar · sem-acesso ·
 * configurar · codigo · carregando · erro · vazio (combináveis: /pessoas?estado=leitura,erro).
 */
export function useDevAdminState(): DevAdminState {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return NONE;
  const values = (searchParams.get("estado") ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (values.length === 0) return NONE;
  return {
    role: ROLE_VALUES[values.find((v) => v in ROLE_VALUES) ?? ""] ?? "admin",
    access: ACCESS_VALUES[values.find((v) => v in ACCESS_VALUES) ?? ""] ?? "ready",
    forceLoading: values.includes("carregando"),
    forceError: values.includes("erro"),
    empty: values.includes("vazio"),
  };
}
