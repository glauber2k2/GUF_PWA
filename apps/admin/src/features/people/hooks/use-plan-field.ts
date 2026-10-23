"use client";

import { useState } from "react";
import { endOfDayBrasiliaIso, formatDateField } from "@/shared/helpers/brasilia-time";
import { usePlanOptions } from "@/shared/hooks/use-plan-options";

/** Plano manual novo e validade opcional (plano padrão não tem validade). */
export function usePlanField(currentPlanCode: string) {
  const plans = usePlanOptions();
  const [planCode, setPlanCode] = useState(currentPlanCode);
  const [validUntil, setValidUntil] = useState("");
  const selected = plans.data?.find((p) => p.code === planCode);
  const hasValidity = Boolean(selected && !selected.isDefault);

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
  };
}
