import { addDays, addMonths, differenceInCalendarDays, format, getDaysInMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { fromLocalISODate, startOfLocalWeek, toLocalISODate, weekdayPosition } from "./dates";

/**
 * Regras da tela Histórico (puras, sem React). Datas no fuso LOCAL; semana de domingo a sábado.
 * A sequência (streak) NÃO é recalculada aqui: os números vêm sempre de get_streak().
 */

/** Dia treinado (get_training_days): data local, nº de treinos concluídos e volume em kg. */
export interface TrainingDayLike {
  performedOn: string;
  sessions: number;
  volumeKg: number;
}

/** Domingo da semana (dom–sáb) que contém `date`. */
export function weekStart(date: Date): Date {
  return startOfLocalWeek(date);
}

/* ---------------------------------------------------------------------
 * Mês exibido (query string ?mes=2026-10)
 * --------------------------------------------------------------------- */

/** "2026-10" */
export function toMonthKey(date: Date): string {
  return format(date, "yyyy-MM");
}

/** "2026-10" → 1º de outubro de 2026 (local). Valor inválido → null. */
export function parseMonthKey(key: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Number(match[1]), month - 1, 1);
}

/** "Outubro 2026" */
export function monthLabel(month: Date): string {
  const name = format(month, "MMMM", { locale: ptBR });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${month.getFullYear()}`;
}

/** Primeiro e último dia do mês em datas locais "yyyy-MM-dd" (consulta do calendário). */
export function monthRange(month: Date): { from: string; to: string } {
  const first = startOfMonth(month);
  return { from: toLocalISODate(first), to: toLocalISODate(addDays(addMonths(first, 1), -1)) };
}

/** 1º dia do mês de `date` (local). */
export function startOfMonthOf(date: Date): Date {
  return startOfMonth(date);
}

/** Mês deslocado (−1 anterior, +1 próximo). */
export function shiftMonth(month: Date, delta: number): Date {
  return addMonths(startOfMonth(month), delta);
}

/** Meses entre `month` e o mês de `today` (0 = mês atual). */
export function monthsBack(month: Date, today: Date): number {
  return (today.getFullYear() - month.getFullYear()) * 12 + today.getMonth() - month.getMonth();
}

export interface MonthDayCell {
  iso: string;
  day: number;
  /** Dia da semana 0 = domingo … 6 = sábado. */
  weekdayIndex: number;
}

/**
 * Grade do mês com a semana começando no domingo: espaços vazios (null) antes do dia 1
 * e um item por dia do mês.
 */
export function monthGrid(month: Date): Array<MonthDayCell | null> {
  const first = startOfMonth(month);
  const leading = weekdayPosition(first);
  const days = Array.from({ length: getDaysInMonth(first) }, (_, i) => {
    const date = addDays(first, i);
    return { iso: toLocalISODate(date), day: i + 1, weekdayIndex: (leading + i) % 7 };
  });
  return [...Array.from({ length: leading }, () => null), ...days];
}

/* ---------------------------------------------------------------------
 * Calendário: intensidade do dia e resumo do mês
 * --------------------------------------------------------------------- */

/** Nível de volume do dia treinado: 1 (menor) a 3 (maior). */
export type DayLevel = 1 | 2 | 3;

/** Limites dos tercis dos volumes dos dias treinados; null com menos de 3 dias com volume. */
export function volumeTertiles(volumes: readonly number[]): [number, number] | null {
  const sorted = volumes.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length < 3) return null;
  return [sorted[Math.floor(sorted.length / 3)] ?? 0, sorted[Math.floor((sorted.length * 2) / 3)] ?? 0];
}

/** Nível do dia pelos tercis do período (poucos dados → nível 1 para todos os dias treinados). */
export function dayIntensity(volumeKg: number, tertiles: [number, number] | null): DayLevel {
  if (!tertiles) return 1;
  if (volumeKg < tertiles[0]) return 1;
  return volumeKg < tertiles[1] ? 2 : 3;
}

export interface MonthSummary {
  sessions: number;
  trainedDays: number;
  volumeKg: number;
}

export function monthSummary(days: readonly TrainingDayLike[]): MonthSummary {
  return days.reduce(
    (acc, d) => ({ sessions: acc.sessions + d.sessions, trainedDays: acc.trainedDays + 1, volumeKg: acc.volumeKg + d.volumeKg }),
    { sessions: 0, trainedDays: 0, volumeKg: 0 },
  );
}

/* ---------------------------------------------------------------------
 * Faixa das últimas semanas (mesma regra da sequência: ≥ 1 treino concluído)
 * --------------------------------------------------------------------- */

export interface StripWeek {
  /** Segunda-feira da semana, "yyyy-MM-dd". */
  weekStart: string;
  trained: boolean;
  current: boolean;
}

/** Últimas `count` semanas (seg–dom), da mais antiga para a atual. */
export function recentWeeksStrip(days: readonly TrainingDayLike[], today: Date, count = 12): StripWeek[] {
  const trainedWeeks = new Set(days.filter((d) => d.sessions > 0).map((d) => toLocalISODate(weekStart(fromLocalISODate(d.performedOn)))));
  const current = weekStart(today);
  return Array.from({ length: count }, (_, i) => {
    const iso = toLocalISODate(addDays(current, (i - count + 1) * 7));
    return { weekStart: iso, trained: trainedWeeks.has(iso), current: i === count - 1 };
  });
}

/* ---------------------------------------------------------------------
 * Gráfico: volume médio por dia treinado, por semana
 * --------------------------------------------------------------------- */

export type ChartPeriod = "4s" | "3m" | "6m" | "1a";

/** Semanas de cada período do gráfico. */
export const CHART_PERIOD_WEEKS: Record<ChartPeriod, number> = { "4s": 4, "3m": 13, "6m": 26, "1a": 52 };

export const CHART_PERIOD_LABELS: Record<ChartPeriod, { short: string; long: string }> = {
  "4s": { short: "4 sem", long: "últimas 4 semanas" },
  "3m": { short: "3 meses", long: "últimos 3 meses" },
  "6m": { short: "6 meses", long: "últimos 6 meses" },
  "1a": { short: "1 ano", long: "último ano" },
};

export function isChartPeriod(value: string | null | undefined): value is ChartPeriod {
  return value !== null && value !== undefined && value in CHART_PERIOD_WEEKS;
}

/** Semanas necessárias para o maior período e a comparação com o período anterior. */
export const HISTORY_WEEKS = CHART_PERIOD_WEEKS["1a"] * 2;

/** Intervalo (datas locais) que cobre `weeks` semanas terminando na semana de `today`. */
export function weeksRange(today: Date, weeks: number): { from: string; to: string } {
  return { from: toLocalISODate(addDays(weekStart(today), -(weeks - 1) * 7)), to: toLocalISODate(today) };
}

export interface WeekVolume {
  /** Segunda-feira da semana, "yyyy-MM-dd". */
  weekStart: string;
  sessions: number;
  /** Média do volume dos dias treinados com volume; null = semana sem treino (lacuna, nunca zero). */
  averageVolumeKg: number | null;
}

/**
 * Volume médio por dia treinado em cada uma das `weeks` semanas que terminam na semana de `today`
 * (`offset` semanas antes, para o período anterior). Dias sem volume (ex.: só cardio) não entram na média.
 */
export function weeklyAverageVolume(days: readonly TrainingDayLike[], today: Date, weeks: number, offset = 0): WeekVolume[] {
  const last = addDays(weekStart(today), -offset * 7);
  const first = addDays(last, -(weeks - 1) * 7);
  const buckets = Array.from({ length: weeks }, (_, i) => ({ weekStart: toLocalISODate(addDays(first, i * 7)), sessions: 0, sum: 0, volumeDays: 0 }));
  for (const d of days) {
    const index = Math.floor(differenceInCalendarDays(fromLocalISODate(d.performedOn), first) / 7);
    const bucket = buckets[index];
    if (!bucket) continue;
    bucket.sessions += d.sessions;
    if (d.volumeKg > 0) {
      bucket.sum += d.volumeKg;
      bucket.volumeDays += 1;
    }
  }
  return buckets.map((b) => ({ weekStart: b.weekStart, sessions: b.sessions, averageVolumeKg: b.volumeDays ? b.sum / b.volumeDays : null }));
}

/** Média do período: média das semanas com treino (semanas vazias não puxam a média para baixo). */
export function periodAverage(weeks: readonly WeekVolume[]): number | null {
  const values = weeks.map((w) => w.averageVolumeKg).filter((v): v is number => v !== null);
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

/** Variação % (inteira) do período atual sobre o anterior; null sem dados de um dos dois. */
export function periodComparison(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Média móvel de 3 pontos (linha de tendência); semanas sem treino continuam null. */
export function trendLine(values: ReadonlyArray<number | null>): Array<number | null> {
  const points = values.flatMap((v, i) => (v === null ? [] : [{ i, v }]));
  const smoothed = new Map(
    points.map((p, j) => {
      const window = points.slice(Math.max(0, j - 1), j + 2);
      return [p.i, window.reduce((a, q) => a + q.v, 0) / window.length] as const;
    }),
  );
  return values.map((_, i) => smoothed.get(i) ?? null);
}

/** Topo "redondo" do eixo Y (folga de 28% sobre o maior valor). */
export function chartAxisMax(maxValue: number, step: number): number {
  return Math.max(step, Math.ceil((maxValue * 1.28) / step) * step);
}

/** "6 out" */
export function formatDayMonth(date: Date): string {
  return format(date, "d MMM", { locale: ptBR }).replace(".", "");
}

/* ---------------------------------------------------------------------
 * Recordes de um treino do passado (mesma regra do finish_workout)
 * --------------------------------------------------------------------- */

export interface ExerciseSessionBest {
  sessionId: string;
  performedOn: string;
  maxWeightKg: number;
}

/**
 * O treino `sessionId` bateu o recorde de carga do exercício?
 * Compara com todos os treinos concluídos ANTES dele: dias anteriores e, no mesmo dia,
 * os que terminaram antes (`earlierSameDay`). Primeira vez do exercício nunca é recorde.
 * Retorna a carga do recorde ou null.
 */
export function sessionLoadRecord(
  history: readonly ExerciseSessionBest[],
  sessionId: string,
  performedOn: string,
  earlierSameDay: ReadonlySet<string>,
): number | null {
  const current = history.find((h) => h.sessionId === sessionId);
  if (!current) return null;
  const previous = history.filter(
    (h) => h.sessionId !== sessionId && (h.performedOn < performedOn || (h.performedOn === performedOn && earlierSameDay.has(h.sessionId))),
  );
  if (previous.length === 0) return null;
  const previousBest = Math.max(...previous.map((h) => h.maxWeightKg));
  return current.maxWeightKg > previousBest ? current.maxWeightKg : null;
}

/** Melhor carga ANTES do treino (mesma janela do sessionLoadRecord) e o dia em que foi feita; null = primeira vez. */
export function previousLoadBest(
  history: readonly ExerciseSessionBest[],
  sessionId: string,
  performedOn: string,
  earlierSameDay: ReadonlySet<string>,
): { weightKg: number; performedOn: string } | null {
  let best: ExerciseSessionBest | null = null;
  for (const h of history) {
    if (h.sessionId === sessionId) continue;
    if (!(h.performedOn < performedOn || (h.performedOn === performedOn && earlierSameDay.has(h.sessionId)))) continue;
    if (!best || h.maxWeightKg > best.maxWeightKg || (h.maxWeightKg === best.maxWeightKg && h.performedOn > best.performedOn)) best = h;
  }
  return best ? { weightKg: best.maxWeightKg, performedOn: best.performedOn } : null;
}

/* ---------------------------------------------------------------------
 * Derivados usados pela tela
 * --------------------------------------------------------------------- */

/** Semanas usadas para os tercis do calendário (mesma janela da faixa de semanas). */
export const CALENDAR_TERTILE_WEEKS = 12;

/** Tercis de volume das últimas semanas: o realce do calendário fica comparável entre meses. */
export function calendarTertiles(days: readonly TrainingDayLike[], today: Date, weeks = CALENDAR_TERTILE_WEEKS): [number, number] | null {
  const { from } = weeksRange(today, weeks);
  return volumeTertiles(days.filter((d) => d.performedOn >= from).map((d) => d.volumeKg));
}

/** Quantas semanas têm volume registrado (menos de 2 → "poucos dados" no gráfico). */
export function weeksWithVolume(days: readonly TrainingDayLike[]): number {
  return new Set(days.filter((d) => d.volumeKg > 0).map((d) => toLocalISODate(weekStart(fromLocalISODate(d.performedOn))))).size;
}
