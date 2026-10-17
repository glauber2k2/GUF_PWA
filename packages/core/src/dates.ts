import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Datas sempre no fuso LOCAL do usuário (o Date do JS já está no fuso do aparelho).
 * Nunca usar toISOString() para datas de calendário: isso converte para UTC.
 */

const WEEKDAY_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** A semana do app vai de domingo a sábado (calendários, sequência, meta semanal e stories). */
export const WEEK_STARTS_ON = 0;

/** Iniciais dos dias na ordem da semana do app: D S T Q Q S S. */
export const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"] as const;

/** Nomes curtos na ordem da semana do app: Dom, Seg … Sáb. */
export const WEEKDAY_SHORT_NAMES = WEEKDAY_SHORT;

/** Domingo da semana (dom–sáb) que contém a data. */
export function startOfLocalWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
}

/** Posição do dia na semana do app: 0 = domingo … 6 = sábado. */
export function weekdayPosition(date: Date): number {
  return date.getDay();
}

/** Data local no formato do banco (performed_on): "2026-10-09". */
export function toLocalISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Data local deslocada em dias (sem passar por UTC). */
export function addLocalDays(date: Date, days: number): Date {
  return addDays(date, days);
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

/** Semana de domingo a sábado que contém `today` (regra da sequência: dom–sáb). */
export function currentWeek(today: Date): WeekDay[] {
  const sunday = startOfLocalWeek(today);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(sunday, i);
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

/** "12 mar 2026" (data por extenso curta, sem dia da semana). */
export function formatDayMonthYear(date: Date): string {
  return format(date, "d MMM yyyy", { locale: ptBR }).replace(".", "");
}
