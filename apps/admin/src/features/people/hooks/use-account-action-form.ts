"use client";

import { useState } from "react";
import { banEndsAt, isConfirmationTyped, isReasonComplete, type BanDuration, type ChangeReason } from "@guf/core";
import { ACCOUNT_ACTIONS, type AccountActionInput, type AccountActionKind } from "@/features/people/helpers/account-actions";
import { endOfDayBrasiliaIso, toBrasiliaIso } from "@/shared/helpers/brasilia-time";
import { usePlanOptions } from "@/shared/hooks/use-plan-options";

const DEFAULT_TIME = "09:00";

/** Erro de cada campo do formulário (só aparece depois de tentar confirmar). */
type FieldErrors = Partial<Record<"plan" | "date" | "confirm" | "reason", string>>;

/**
 * Campos do diálogo de ação de conta: motivo (exceto desvincular, que é sempre a pedido da pessoa) e
 * o que cada ação precisa — plano, prazo da suspensão, data da exclusão ou a palavra de confirmação.
 */
export function useAccountActionForm(kind: AccountActionKind) {
  const plans = usePlanOptions();
  const [reason, setReason] = useState<ChangeReason | null>(null);
  const [note, setNote] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [banDuration, setBanDuration] = useState<BanDuration>("7d");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(DEFAULT_TIME);
  const [confirmWord, setConfirmWord] = useState("");
  const [isConfirmed, setConfirmed] = useState(false);
  // Avisar a pessoa da mudança de plano: ligado por padrão (transparência); a equipe pode desligar.
  const [notify, setNotify] = useState(true);
  const [tried, setTried] = useState(false);

  const selectedPlan = plans.data?.find((p) => p.code === planCode);
  const chosenInstant = toBrasiliaIso(date, time);
  const isFuture = Boolean(chosenInstant && chosenInstant > new Date().toISOString());
  const needsReason = kind !== "unlink_social";
  const needsDate = kind === "schedule_deletion" || (kind === "ban" && banDuration === "custom");
  const confirmationWord = ACCOUNT_ACTIONS[kind].confirmationWord;

  const confirmError = (): string | undefined => {
    if (confirmationWord && !isConfirmationTyped(confirmWord, confirmationWord)) return `Digite ${confirmationWord} para confirmar.`;
    if (kind === "unlink_social" && !isConfirmed) return "Confirme que as pessoas pediram.";
    return undefined;
  };

  const errors: FieldErrors = {
    plan: kind === "plan" && !selectedPlan ? "Escolha o plano." : undefined,
    date: needsDate && !isFuture ? "Escolha uma data e um horário no futuro." : undefined,
    confirm: confirmError(),
    reason: needsReason && !isReasonComplete(reason, note) ? "reason" : undefined,
  };
  const isValid = Object.values(errors).every((e) => !e);

  const toInput = (): AccountActionInput | null => {
    if (kind === "unlink_social") return { kind, note };
    if (!reason) return null;
    const base = { reason, note };
    switch (kind) {
      case "plan":
        return { kind, planCode, validUntil: selectedPlan?.isDefault ? null : endOfDayBrasiliaIso(validUntil), notify, ...base };
      case "ban": {
        const endsAt = banEndsAt(banDuration, chosenInstant);
        return endsAt === undefined ? null : { kind, endsAt, ...base };
      }
      case "schedule_deletion":
        return chosenInstant ? { kind, at: chosenInstant, ...base } : null;
      default:
        return { kind, ...base };
    }
  };

  /** Valida e devolve o pedido pronto (null = mostra os erros). */
  const submit = (): AccountActionInput | null => {
    setTried(true);
    return isValid ? toInput() : null;
  };

  return {
    plans: plans.data ?? [],
    planCode,
    setPlanCode,
    validUntil,
    setValidUntil,
    showValidUntil: Boolean(selectedPlan && !selectedPlan.isDefault),
    banDuration,
    setBanDuration,
    needsDate,
    date,
    setDate,
    time,
    setTime,
    confirmationWord,
    confirmWord,
    setConfirmWord,
    notify,
    setNotify,
    isConfirmed,
    setConfirmed,
    needsReason,
    reason,
    setReason,
    note,
    setNote,
    errors: tried ? errors : {},
    submit,
  };
}
