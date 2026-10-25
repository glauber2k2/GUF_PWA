"use client";

import { useState } from "react";
import { planChangeKind, type PlanChangeKind } from "@guf/core";
import { endOfDayBrasiliaIso, formatDateField } from "@/shared/helpers/brasilia-time";
import { usePlanOptions } from "@/shared/hooks/use-plan-options";

/** Plano manual novo e validade opcional (plano padrão não tem validade). */
export function usePlanField(currentPlanCode: string) {
  const plans = usePlanOptions();
  const [planCode, setPlanCode] = useState(currentPlanCode);
  const [validUntil, setValidUntil] = useState("");
  const selected = plans.data?.find((p) => p.code === planCode);
  const hasValidity = Boolean(selected && !selected.isDefault);
  const current = plans.data?.find((p) => p.code === currentPlanCode);
  const changeKind: PlanChangeKind = current && selected ? planChangeKind(current.rank, selected.rank) : "change";

  return {
    plans: plans.data ?? [],
    planCode,
    setPlanCode,
    validUntil,
    setValidUntil,
    showValidUntil: hasValidity,
    isValid: planCode !== currentPlanCode || (hasValidity && Boolean(validUntil)),
    label: `${selected?.name ?? planCode}${hasValidity && validUntil ? ` até ${formatDateField(validUntil)}` : ""}`,
    validUntilIso: hasValidity ? endOfDayBrasiliaIso(validUntil) : null,
    /** Upgrade, downgrade ou alteração (mesmo nível): rótulo do aviso para a pessoa. */
    changeKind,
  };
}
