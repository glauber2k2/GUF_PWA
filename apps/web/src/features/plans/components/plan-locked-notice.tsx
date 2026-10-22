"use client";

import { useEffect } from "react";
import { Crown } from "lucide-react";
import type { PlanFeature } from "@guf/core";
import { EmptyState } from "@/shared/components/ds";
import { usePlanGate } from "@/features/plans/hooks/use-plan-gate";

export interface PlanLockedNoticeProps {
  feature: PlanFeature;
  title: string;
  message: string;
}

/**
 * Conteúdo aberto por link que está fora do plano (ex.: resumo de um treino antigo): a tela do Pro
 * aparece ao entrar e, ao fechá-la, fica este aviso no lugar do conteúdo (o dado continua guardado).
 */
export function PlanLockedNotice({ feature, title, message }: PlanLockedNoticeProps) {
  const { showUpsell } = usePlanGate();

  useEffect(() => {
    showUpsell(feature);
  }, [feature, showUpsell]);

  return <EmptyState icon={Crown} title={title} message={message} actionLabel="Conhecer o Pro" onAction={() => showUpsell(feature)} />;
}
