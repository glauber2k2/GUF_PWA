/**
 * Comunicados recorrentes: a regra (todo dia, toda semana, todo mês, todo ano, a cada N), quanto
 * tempo cada vez fica no app e as próximas vezes. Mesmas contas de
 * `announcement_occurrence_start` no banco: horário de Brasília (sem horário de verão), começando
 * no início da 1ª vez; mês a partir do dia de início (dia 31 cai no último dia dos meses curtos).
 * Unidade nova = entrada em RECURRENCE_UNITS + o mesmo valor no banco (check e funções da migration
 * 20261108140000_announcement_recurrence).
 */

export type RecurrenceUnit = "day" | "week" | "month" | "year";

/** Regra de repetição de um comunicado. */
export interface AnnouncementRecurrence {
  unit: RecurrenceUnit;
  /** A cada N unidades (1–99). */
  every: number;
  /** Quanto tempo cada vez fica no app, em horas (cabe no intervalo). */
  windowHours: number;
}

export interface RecurrenceUnitDefinition {
  /** Rótulo curto da opção ("Semanal"). */
  option: string;
  /** "Toda semana" (a cada 1). */
  everyOne: string;
  singular: string;
  plural: string;
  /** Menor duração do intervalo de 1 unidade, em horas (mês = 28 dias, ano = 365). */
  periodHours: number;
  /** Meses por unidade (0 = conta em horas). */
  months: number;
}

export const RECURRENCE_UNITS: Record<RecurrenceUnit, RecurrenceUnitDefinition> = {
  day: { option: "Diário", everyOne: "Todo dia", singular: "dia", plural: "dias", periodHours: 24, months: 0 },
  week: { option: "Semanal", everyOne: "Toda semana", singular: "semana", plural: "semanas", periodHours: 168, months: 0 },
  month: { option: "Mensal", everyOne: "Todo mês", singular: "mês", plural: "meses", periodHours: 672, months: 1 },
  year: { option: "Anual", everyOne: "Todo ano", singular: "ano", plural: "anos", periodHours: 8760, months: 12 },
};

export const RECURRENCE_UNIT_ORDER: RecurrenceUnit[] = ["day", "week", "month", "year"];

export const RECURRENCE_EVERY_MIN = 1;
export const RECURRENCE_EVERY_MAX = 99;

/** Quanto tempo cada vez pode ficar no app (só aparecem as que cabem no intervalo). */
export const RECURRENCE_WINDOW_OPTIONS: ReadonlyArray<{ hours: number; label: string }> = [
  { hours: 1, label: "1 hora" },
  { hours: 3, label: "3 horas" },
  { hours: 6, label: "6 horas" },
  { hours: 12, label: "12 horas" },
  { hours: 24, label: "1 dia" },
  { hours: 72, label: "3 dias" },
  { hours: 168, label: "1 semana" },
  { hours: 720, label: "30 dias" },
];

export const DEFAULT_RECURRENCE_WINDOW_HOURS = 24;

/** Horário em que o painel agenda (igual ao banco). Brasília não tem horário de verão desde 2019. */
export const ANNOUNCEMENT_TIME_ZONE = "America/Sao_Paulo";
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
/** Teto de voltas ao procurar as próximas vezes (evita laço sem fim com dados estranhos). */
const MAX_OCCURRENCE_SCAN = 5000;

/** Menor intervalo entre duas vezes, em horas. */
export function recurrencePeriodHours(unit: RecurrenceUnit, every: number): number {
  return RECURRENCE_UNITS[unit].periodHours * every;
}

/** Opções de "fica no app por" que cabem no intervalo. */
export function recurrenceWindowOptions(unit: RecurrenceUnit, every: number): ReadonlyArray<{ hours: number; label: string }> {
  const period = recurrencePeriodHours(unit, every);
  return RECURRENCE_WINDOW_OPTIONS.filter((option) => option.hours <= period);
}

/**
 * Monta a regra nos limites: "a cada" entre 1 e 99 e o tempo no app trocado pelo maior que cabe
 * quando a unidade ou o intervalo diminuem.
 */
export function buildRecurrence(unit: RecurrenceUnit, every: number, windowHours: number): AnnouncementRecurrence {
  const safeEvery = Math.min(RECURRENCE_EVERY_MAX, Math.max(RECURRENCE_EVERY_MIN, Math.round(every)));
  const options = recurrenceWindowOptions(unit, safeEvery);
  const fits = options.some((option) => option.hours === windowHours);
  const fallback = options.filter((option) => option.hours <= windowHours).at(-1) ?? options[0];
  return { unit, every: safeEvery, windowHours: fits ? windowHours : (fallback?.hours ?? DEFAULT_RECURRENCE_WINDOW_HOURS) };
}

/** A regra respeita os limites do banco? */
export function isRecurrenceValid(rule: AnnouncementRecurrence): boolean {
  return (
    Number.isInteger(rule.every) &&
    rule.every >= RECURRENCE_EVERY_MIN &&
    rule.every <= RECURRENCE_EVERY_MAX &&
    rule.windowHours >= 1 &&
    rule.windowHours <= recurrencePeriodHours(rule.unit, rule.every)
  );
}

/** "Toda semana" · "A cada 2 semanas". */
export function recurrenceEveryLabel(unit: RecurrenceUnit, every: number): string {
  const definition = RECURRENCE_UNITS[unit];
  return every === 1 ? definition.everyOne : `A cada ${every} ${definition.plural}`;
}

/** "1 dia" · "6 horas" (opções do catálogo; outro valor vira horas). */
export function recurrenceWindowLabel(hours: number): string {
  return RECURRENCE_WINDOW_OPTIONS.find((option) => option.hours === hours)?.label ?? `${hours} horas`;
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Soma meses no horário de Brasília, prendendo o dia no fim do mês (31/jan + 1 mês = 28/fev). */
function addMonthsInBrasilia(instant: Date, months: number): Date {
  const wall = new Date(instant.getTime() + BRASILIA_OFFSET_MS);
  const totalMonths = wall.getUTCMonth() + months;
  const year = wall.getUTCFullYear() + Math.floor(totalMonths / 12);
  const monthIndex = ((totalMonths % 12) + 12) % 12;
  const day = Math.min(wall.getUTCDate(), daysInMonth(year, monthIndex));
  const shifted = Date.UTC(year, monthIndex, day, wall.getUTCHours(), wall.getUTCMinutes(), wall.getUTCSeconds());
  return new Date(shifted - BRASILIA_OFFSET_MS);
}

/**
 * Começo da vez de número `index` (0 = a primeira).
 * @param startsAt começo da 1ª vez
 */
export function recurrenceOccurrence(startsAt: Date, rule: AnnouncementRecurrence, index: number): Date {
  const months = RECURRENCE_UNITS[rule.unit].months;
  if (months > 0) return addMonthsInBrasilia(startsAt, months * rule.every * index);
  return new Date(startsAt.getTime() + recurrencePeriodHours(rule.unit, rule.every) * HOUR_MS * index);
}

/**
 * Próximas vezes que ainda não terminaram (a que está valendo entra primeiro).
 * @param endsAt fim da campanha (nulo = sem fim)
 * @returns até `count` começos, em ordem
 */
export function upcomingOccurrences(
  startsAt: Date,
  rule: AnnouncementRecurrence,
  from: Date,
  count: number,
  endsAt: Date | null = null,
): Date[] {
  const result: Date[] = [];
  for (let index = 0; index < MAX_OCCURRENCE_SCAN && result.length < count; index += 1) {
    const occurrence = recurrenceOccurrence(startsAt, rule, index);
    if (endsAt && occurrence >= endsAt) break;
    if (occurrence.getTime() + rule.windowHours * HOUR_MS > from.getTime()) result.push(occurrence);
  }
  return result;
}

/** Fim da campanha que para depois de `times` vezes: fim da última vez. */
export function recurrenceEndAfter(startsAt: Date, rule: AnnouncementRecurrence, times: number): Date {
  const last = recurrenceOccurrence(startsAt, rule, Math.max(1, Math.round(times)) - 1);
  return new Date(last.getTime() + rule.windowHours * HOUR_MS);
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: ANNOUNCEMENT_TIME_ZONE });
const DAY_OF_MONTH_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", timeZone: ANNOUNCEMENT_TIME_ZONE });
const DAY_MONTH_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: ANNOUNCEMENT_TIME_ZONE });
const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: ANNOUNCEMENT_TIME_ZONE });

/** Onde cai cada vez: "na quarta-feira", "no dia 31", "em 10 de março" (nada para diário). */
function recurrenceAnchor(startsAt: Date, unit: RecurrenceUnit): string | null {
  if (unit === "week") return `na ${WEEKDAY_FORMAT.format(startsAt)}`.replace("na sábado", "no sábado").replace("na domingo", "no domingo");
  if (unit === "month") return `no dia ${DAY_OF_MONTH_FORMAT.format(startsAt)}`;
  if (unit === "year") return `em ${DAY_MONTH_FORMAT.format(startsAt)}`;
  return null;
}

/**
 * Resumo da repetição: "Toda semana na quarta-feira, às 09:00 · fica 1 dia no app".
 * Mês começando depois do dia 28 avisa que os meses curtos usam o último dia.
 */
export function recurrenceSummary(startsAt: Date, rule: AnnouncementRecurrence): string {
  const anchor = recurrenceAnchor(startsAt, rule.unit);
  const when = [recurrenceEveryLabel(rule.unit, rule.every), anchor].filter(Boolean).join(" ");
  const shortMonths = rule.unit === "month" && Number(DAY_OF_MONTH_FORMAT.format(startsAt)) > 28 ? " (nos meses mais curtos, no último dia)" : "";
  return `${when}, às ${TIME_FORMAT.format(startsAt)}${shortMonths} · fica ${recurrenceWindowLabel(rule.windowHours)} no app`;
}

/** Vezes inteiras entre dois instantes (para contar quantas couberam até a data de fim). */
export function countOccurrencesUntil(startsAt: Date, rule: AnnouncementRecurrence, endsAt: Date): number {
  let count = 0;
  while (count < MAX_OCCURRENCE_SCAN && recurrenceOccurrence(startsAt, rule, count) < endsAt) count += 1;
  return count;
}
