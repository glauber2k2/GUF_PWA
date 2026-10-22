"use client";

import { useState } from "react";
import type { AdminUserDetail } from "@guf/api/admin";
import { describeReason, isReasonComplete, normalizeHandle, type ChangeReason } from "@guf/core";
import { staffNameSchema } from "@guf/schemas";
import { useHandleAvailability, useSetPlan, useUpdateHandle, useUpdateName } from "@/features/people/api/use-people";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { usePlanOptions } from "@/shared/hooks/use-plan-options";

export type EditField = "plan" | "handle" | "name";
export type EditStage = "form" | "review";

const FIELD_LABELS: Record<EditField, string> = { plan: "Plano", handle: "@", name: "Nome" };

const HANDLE_MESSAGES = {
  invalid: "Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.",
  taken: "Esse @ já está em uso. Tente outro.",
  same: "Esse já é o @ atual. Digite um novo.",
} as const;

/** "2027-10-22" (campo de data) → fim do dia em Brasília, em ISO. */
function endOfDayIso(day: string): string | null {
  return day ? new Date(`${day}T23:59:59-03:00`).toISOString() : null;
}

/**
 * Estado do diálogo "Editar conta" (protótipo 5a–5e): campo, valor novo com validação, motivo
 * obrigatório e resumo antes de confirmar. Salvar fica no banco (auditado com o motivo).
 */
export function useAccountEdit(person: AdminUserDetail, initialField: EditField, onDone: (message: string) => void) {
  const [field, setFieldState] = useState<EditField>(initialField);
  const [stage, setStage] = useState<EditStage>("form");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState(person.name ?? "");
  const [planCode, setPlanCode] = useState(person.plan.code);
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState<ChangeReason | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  const plans = usePlanOptions();
  const debouncedHandle = useDebouncedValue(normalizeHandle(handle), 350);
  const availability = useHandleAvailability(person.userId, debouncedHandle, field === "handle");
  const updateHandle = useUpdateHandle();
  const updateName = useUpdateName();
  const setPlan = useSetPlan();

  const handleStatus = debouncedHandle === normalizeHandle(handle) ? availability.data : undefined;
  const handleError = handleStatus && handleStatus !== "available" ? HANDLE_MESSAGES[handleStatus] : undefined;
  const nameParse = staffNameSchema.safeParse(name);
  const nameError = nameParse.success ? (nameParse.data === (person.name ?? "") ? "Esse já é o nome atual." : undefined) : nameParse.error.issues[0]?.message;
  const selectedPlan = plans.data?.find((p) => p.code === planCode);
  const planChanged = planCode !== person.plan.code || (Boolean(validUntil) && !selectedPlan?.isDefault);

  const isValueValid = { handle: handleStatus === "available", name: !nameError, plan: planChanged }[field];
  const isReasonValid = isReasonComplete(reason, note);

  const currentValue = { plan: person.plan.name, handle: person.handle ? `@${person.handle}` : "Sem @", name: person.name ?? "Sem nome" }[field];
  const nextValue = {
    plan: `${selectedPlan?.name ?? planCode}${validUntil && !selectedPlan?.isDefault ? ` até ${validUntil.split("-").reverse().join("/")}` : ""}`,
    handle: `@${normalizeHandle(handle)}`,
    name: name.trim(),
  }[field];

  const mutation = { handle: updateHandle, name: updateName, plan: setPlan }[field];

  const setField = (next: EditField) => {
    setFieldState(next);
    setTried(false);
  };

  const toReview = () => {
    setTried(true);
    if (isValueValid && isReasonValid) setStage("review");
  };

  const confirm = () => {
    if (!reason) return;
    const base = { userId: person.userId, reason, note };
    const done = () => onDone(`${FIELD_LABELS[field] === "@" ? "@" : FIELD_LABELS[field]} alterado para ${nextValue}`);
    if (field === "handle") updateHandle.mutate({ ...base, handle: normalizeHandle(handle) }, { onSuccess: done });
    if (field === "name") updateName.mutate({ ...base, name: name.trim() }, { onSuccess: done });
    if (field === "plan") setPlan.mutate({ ...base, planCode, validUntil: selectedPlan?.isDefault ? null : endOfDayIso(validUntil) }, { onSuccess: done });
  };

  return {
    field,
    setField,
    stage,
    backToForm: () => setStage("form"),
    fieldLabel: FIELD_LABELS[field],
    currentValue,
    nextValue,
    handle,
    setHandle,
    handleError: tried || handle ? handleError : undefined,
    handleHint: handleStatus === "available" ? `@${normalizeHandle(handle)} está disponível.` : undefined,
    name,
    setName,
    nameError: tried || name !== (person.name ?? "") ? nameError : undefined,
    plans: plans.data ?? [],
    planCode,
    setPlanCode,
    validUntil,
    setValidUntil,
    showValidUntil: Boolean(selectedPlan && !selectedPlan.isDefault),
    reason,
    setReason,
    note,
    setNote,
    showReasonError: tried && !isReasonValid,
    showPlanError: tried && field === "plan" && !planChanged,
    reasonText: describeReason(reason, note),
    toReview,
    confirm,
    isSaving: mutation.isPending,
    saveError: mutation.error,
  };
}
