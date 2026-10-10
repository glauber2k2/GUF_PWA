import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Datas sempre no fuso LOCAL do usuário (o Date do JS já está no fuso do aparelho).
 * Nunca usar toISOString() para datas de calendário: isso converte para UTC.
 */

const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Data local no formato do banco (performed_on): "2026-10-09". */
export function toLocalISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Converte "2026-10-09" em Date local (meia-noite no fuso do aparelho). */
export function fromLocalISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** "Sexta, 9 de outubro" */
export function formatLongDate(date: Date): string {
  return `${WEEKDAY_LONG[date.getDay()]}, ${format(date, "d 'de' MMMM", { locale: ptBR })}`;
}

/** "Sex, 9 out" */
export function formatShortDate(date: Date): string {
  return `${WEEKDAY_SHORT[date.getDay()]}, ${format(date, "d MMM", { locale: ptBR }).replace(".", "")}`;
}

export type WeekDayRelation = "past" | "today" | "future";

export interface WeekDay {
  /** "2026-10-05" (data local) */
  iso: string;
  date: Date;
  /** Inicial do dia: "S", "T", "Q"… */
  initial: string;
  /** Nome curto: "Seg", "Ter"… */
  shortName: string;
  dayOfMonth: number;
  relation: WeekDayRelation;
}

/** Semana de segunda a domingo que contém `today` (regra da sequência: seg–dom). */
export function currentWeek(today: Date): WeekDay[] {
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const shortName = WEEKDAY_SHORT[date.getDay()] ?? "";
    const relation: WeekDayRelation = isSameDay(date, today) ? "today" : date < today ? "past" : "future";
    return {
      iso: toLocalISODate(date),
      date,
      initial: shortName.charAt(0),
      shortName,
      dayOfMonth: date.getDate(),
      relation,
    };
  });
}
