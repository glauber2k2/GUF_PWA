import { addDays, differenceInCalendarDays } from "date-fns";
import { formatShortDate } from "./dates";
import { suggestNextRoutine, type RoutineOrder } from "./home";

/**
 * Dias da semana das rotinas e "treino de hoje" (puras, sem React).
 * Dias no padrão ISO do banco (routines.weekdays): 1 = segunda … 7 = domingo. Na tela, a semana
 * começa no domingo (WEEKDAYS e as listas seguem essa ordem).
 */

export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** Dias na ordem da semana do app (domingo primeiro). */
export const WEEKDAYS: ReadonlyArray<{ iso: IsoWeekday; initial: string; short: string; long: string }> = [
  { iso: 7, initial: "D", short: "Dom", long: "domingo" },
  { iso: 1, initial: "S", short: "Seg", long: "segunda" },
  { iso: 2, initial: "T", short: "Ter", long: "terça" },
  { iso: 3, initial: "Q", short: "Qua", long: "quarta" },
  { iso: 4, initial: "Q", short: "Qui", long: "quinta" },
  { iso: 5, initial: "S", short: "Sex", long: "sexta" },
  { iso: 6, initial: "S", short: "Sáb", long: "sábado" },
];

/** Ordem do dia ISO na semana do app (domingo = 0 … sábado = 6). */
const weekOrder = (d: number) => d % 7;

/** Dia da semana ISO da data local (segunda = 1 … domingo = 7). */
export function isoWeekday(date: Date): IsoWeekday {
  return (((date.getDay() + 6) % 7) + 1) as IsoWeekday;
}

/** Dias marcados/desmarcados, sempre em ordem e sem repetição. */
export function toggleWeekday(days: readonly number[], day: IsoWeekday): IsoWeekday[] {
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
  return [...new Set(next)].sort((a, b) => weekOrder(a) - weekOrder(b)) as IsoWeekday[];
}

/** "Nenhum dia" · "Todos os dias" · "Seg a Sex" · "Seg e Qui" · "Seg, Qua e Sex". */
export function weekdaysLabel(days: readonly number[]): string {
  const sorted = [...new Set(days)].sort((a, b) => weekOrder(a) - weekOrder(b));
  if (sorted.length === 0) return "Nenhum dia";
  if (sorted.length === 7) return "Todos os dias";
  if (sorted.join() === "1,2,3,4,5") return "Seg a Sex";
  const names = sorted.map((d) => WEEKDAYS.find((w) => w.iso === d)?.short ?? "");
  return names.length === 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

export interface ScheduledRoutine extends RoutineOrder {
  weekdays: readonly number[];
}

/**
 * Treino de hoje do projeto ativo:
 * - "scheduled": rotinas marcadas para hoje (a primeira pela ordem; as demais para trocar);
 * - "rest": o projeto usa dias e nenhuma rotina é de hoje → dia de descanso + próximo treino da semana;
 * - "sequence": nenhuma rotina tem dia marcado → a próxima pela ordem depois da última concluída;
 * - "none": projeto sem rotinas.
 */
export type TodayPlan<T> =
  | { kind: "scheduled"; routine: T; others: T[] }
  | { kind: "rest"; next: { routine: T; date: Date } | null }
  | { kind: "sequence"; routine: T }
  | { kind: "none" };

export function todayPlan<T extends ScheduledRoutine>(routines: readonly T[], lastFinishedRoutineId: string | null, today: Date): TodayPlan<T> {
  if (routines.length === 0) return { kind: "none" };
  const ordered = [...routines].sort((a, b) => a.position - b.position);
  if (!ordered.some((r) => r.weekdays.length > 0)) {
    const routine = suggestNextRoutine(ordered, lastFinishedRoutineId);
    return routine ? { kind: "sequence", routine } : { kind: "none" };
  }
  const forDay = (date: Date) => ordered.filter((r) => r.weekdays.includes(isoWeekday(date)));
  const todays = forDay(today);
  if (todays[0]) return { kind: "scheduled", routine: todays[0], others: todays.slice(1) };
  for (let ahead = 1; ahead <= 7; ahead++) {
    const date = addDays(today, ahead);
    const routine = forDay(date)[0];
    if (routine) return { kind: "rest", next: { routine, date } };
  }
  return { kind: "rest", next: null };
}

/** Rotina em destaque e rótulo curto ("Hoje" ou "Próximo") para cards e listas. */
export function highlightedRoutine<T extends ScheduledRoutine>(
  routines: readonly T[],
  lastFinished: { routineId: string; performedOn: string } | null,
  today: Date,
  todayIso: string,
): { routine: T | null; label: "Hoje" | "Próximo" } {
  const plan = todayPlan(routines, lastFinished?.routineId ?? null, today);
  switch (plan.kind) {
    case "scheduled":
      return { routine: plan.routine, label: "Hoje" };
    case "rest":
      return { routine: plan.next?.routine ?? null, label: "Próximo" };
    case "sequence":
      return { routine: plan.routine, label: lastFinished?.performedOn === todayIso ? "Próximo" : "Hoje" };
    default:
      return { routine: null, label: "Hoje" };
  }
}

/** Quando é o próximo treino: "Amanhã" ou "Qua, 14 out". */
export function nextTrainingDayLabel(date: Date, today: Date): string {
  return differenceInCalendarDays(date, today) === 1 ? "Amanhã" : formatShortDate(date);
}
