import { format } from "date-fns";
import { formatDayMonthYear } from "./dates";

/** Segundos que o aviso de conta suspensa fica na tela antes de sair da conta. */
export const ACCOUNT_SUSPENDED_NOTICE_SECONDS = 15;

/**
 * Prazo da suspensão para o aviso: "Até 30 out 2026 · 14:32" ou "Por tempo indeterminado".
 * @param endsAt fim da suspensão (ISO 8601) ou `null` quando indeterminada.
 */
export function suspensionPeriodLabel(endsAt: string | null): string {
  if (!endsAt) return "Por tempo indeterminado";
  const date = new Date(endsAt);
  return `Até ${formatDayMonthYear(date)} · ${format(date, "HH:mm")}`;
}
