"use client";

import { useState } from "react";
import type { ApiError } from "@guf/api";
import type { AdminUserDetail } from "@guf/api/admin";
import { describeReason, isReasonComplete, normalizeHandle, type ChangeReason } from "@guf/core";
import { staffNameSchema } from "@guf/schemas";
import { useHandleAvailability, useSetPlan, useUpdateHandle, useUpdateName } from "@/features/people/api/use-people";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { usePlanOptions } from "@/shared/hooks/use-plan-options";

export type EditField = "plan" | "handle" | "name";
export type EditStage = "form" | "review";

/** Ordem de gravação: @ e nome antes do plano (o plano é o que mais recusa: assinatura paga). */
const FIELD_ORDER: EditField[] = ["handle", "name", "plan"];

export const FIELD_LABELS: Record<EditField, string> = { plan: "Plano", handle: "@", name: "Nome" };

const HANDLE_MESSAGES = {
  invalid: "Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.",
  taken: "Esse @ já está em uso. Tente outro.",
  same: "Esse já é o @ atual. Digite um novo.",
} as const;

export interface FieldChange {
  field: EditField;
  label: string;
  before: string;
  after: string;
}

/** "2027-10-22" (campo de data) → fim do dia em Brasília, em ISO. */
export function endOfDayIso(day: string): string | null {
  return day ? new Date(`${day}T23:59:59-03:00`).toISOString() : null;
}

/** "2027-10-22" → "22/10/2027". */
export function formatDateField(day: string): string {
  return day.split("-").reverse().join("/");
}

/** "@, nome e plano" */
function joinLabels(fields: EditField[]): string {
  const labels = fields.map((f) => FIELD_LABELS[f].toLowerCase());
  return labels.length > 1 ? `${labels.slice(0, -1).join(", ")} e ${labels[labels.length - 1]}` : (labels[0] ?? "");
}

/**
 * Estado do diálogo "Editar conta" (protótipo 5a–5e): plano, @ e nome no mesmo formulário, com um
 * motivo só. Envia só o que mudou, um por vez; se um falhar, os já gravados não são reenviados.
 */
export function useAccountEdit(person: AdminUserDetail, allowedFields: EditField[], onDone: (message: string) => void) {
  const [stage, setStage] = useState<EditStage>("form");
  const [handle, setHandle] = useState("");
  const [name, setName] = useState(person.name ?? "");
  const [planCode, setPlanCode] = useState(person.plan.code);
  const [validUntil, setValidUntil] = useState("");
  const [reason, setReason] = useState<ChangeReason | null>(null);
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState<EditField[]>([]);
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{ field: EditField; error: ApiError } | null>(null);

  const allows = (field: EditField) => allowedFields.includes(field);
  const plans = usePlanOptions();
  const normalizedHandle = normalizeHandle(handle);
  const debouncedHandle = useDebouncedValue(normalizedHandle, 350);
  const availability = useHandleAvailability(person.userId, debouncedHandle, allows("handle") && !saved.includes("handle"));
  const updateHandle = useUpdateHandle();
  const updateName = useUpdateName();
  const setPlan = useSetPlan();

  const handleTyped = normalizedHandle.length > 0;
  const handleStatus = debouncedHandle === normalizedHandle ? availability.data : undefined;
  const handleError = handleTyped && handleStatus && handleStatus !== "available" ? HANDLE_MESSAGES[handleStatus] : undefined;

  const trimmedName = name.trim();
  const nameChanged = trimmedName !== (person.name ?? "").trim();
  const nameParse = staffNameSchema.safeParse(name);
  const nameError = nameChanged && !nameParse.success ? nameParse.error.issues[0]?.message : undefined;

  const selectedPlan = plans.data?.find((p) => p.code === planCode);
  const planChanged = planCode !== person.plan.code || (Boolean(validUntil) && !selectedPlan?.isDefault);

  const changes: FieldChange[] = FIELD_ORDER.filter(allows).flatMap((field): FieldChange[] => {
    if (field === "handle" && handleTyped) {
      return [{ field, label: FIELD_LABELS.handle, before: person.handle ? `@${person.handle}` : "Sem @", after: `@${normalizedHandle}` }];
    }
    if (field === "name" && nameChanged) return [{ field, label: FIELD_LABELS.name, before: person.name ?? "Sem nome", after: trimmedName }];
    if (field === "plan" && planChanged) {
      const until = validUntil && !selectedPlan?.isDefault ? ` até ${formatDateField(validUntil)}` : "";
      return [{ field, label: FIELD_LABELS.plan, before: person.plan.name, after: `${selectedPlan?.name ?? planCode}${until}` }];
    }
    return [];
  });

  const isHandleReady = !handleTyped || handleStatus === "available" || saved.includes("handle");
  const isValueValid = changes.length > 0 && isHandleReady && !nameError;
  const isReasonValid = isReasonComplete(reason, note);

  const toReview = () => {
    setTried(true);
    if (isValueValid && isReasonValid) setStage("review");
  };

  const saveField = (field: EditField, base: { userId: string; reason: ChangeReason; note: string }) => {
    if (field === "handle") return updateHandle.mutateAsync({ ...base, handle: normalizedHandle });
    if (field === "name") return updateName.mutateAsync({ ...base, name: trimmedName });
    return setPlan.mutateAsync({ ...base, planCode, validUntil: selectedPlan?.isDefault ? null : endOfDayIso(validUntil) });
  };

  const confirm = async () => {
    if (!reason) return;
    const base = { userId: person.userId, reason, note };
    const done = [...saved];
    setSaving(true);
    setSaveError(null);
    for (const { field } of changes) {
      if (done.includes(field)) continue;
      try {
        await saveField(field, base);
        done.push(field);
        setSaved([...done]);
      } catch (error) {
        setSaveError({ field, error: error as ApiError });
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    onDone(`${joinLabels(changes.map((c) => c.field))} ${changes.length > 1 ? "alterados" : "alterado"}`.replace(/^./, (c) => c.toUpperCase()));
  };

  return {
    stage,
    backToForm: () => setStage("form"),
    allows,
    changes,
    saved,
    handle,
    setHandle,
    handleError,
    handleHint: handleTyped && handleStatus === "available" ? `@${normalizedHandle} está disponível.` : undefined,
    name,
    setName,
    nameError,
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
    showNoChangeError: tried && changes.length === 0,
    reasonText: describeReason(reason, note),
    toReview,
    confirm: () => void confirm(),
    isSaving,
    saveError: saveError && { label: FIELD_LABELS[saveError.field], message: saveError.error.message },
  };
}
