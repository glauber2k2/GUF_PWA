"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Entitlements, PlanFeature } from "@guf/core";
import { useEntitlements } from "@/features/plans/api/use-plans";
import { ProUpsellScreen } from "@/features/plans/components/pro-upsell-screen";
import { plansPath } from "@/features/plans/helpers/paths";

interface PlanGateContextValue {
  /** Direitos do usuário; null enquanto não carregou (nada é bloqueado no app). */
  entitlements: Entitlements | null;
  /** Abre a tela "Isso faz parte do Pro" para a funcionalidade. */
  showUpsell: (feature: PlanFeature) => void;
}

const PlanGateContext = createContext<PlanGateContextValue | null>(null);

/** Plano do usuário + tela do Pro, disponíveis para todas as telas da área logada. */
export function PlanGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const entitlements = useEntitlements();
  const [feature, setFeature] = useState<PlanFeature | null>(null);

  const close = useCallback(() => setFeature(null), []);
  const seePlans = useCallback(() => {
    const target = feature;
    setFeature(null);
    router.push(plansPath(target));
  }, [feature, router]);

  const value = useMemo<PlanGateContextValue>(
    () => ({ entitlements: entitlements.data ?? null, showUpsell: setFeature }),
    [entitlements.data],
  );

  return (
    <PlanGateContext.Provider value={value}>
      {children}
      <ProUpsellScreen feature={feature} entitlements={value.entitlements} onSeePlans={seePlans} onClose={close} />
    </PlanGateContext.Provider>
  );
}

export function usePlanGateContext(): PlanGateContextValue {
  const context = useContext(PlanGateContext);
  if (!context) throw new Error("usePlanGate precisa estar dentro do PlanGateProvider.");
  return context;
}
