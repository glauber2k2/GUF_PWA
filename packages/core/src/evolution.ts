import { addMonths, differenceInCalendarDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatShortDate, fromLocalISODate, toLocalISODate } from "./dates";
import { formatClock, formatNumber, MINUS_SIGN, plural } from "./format";
import { searchFilter } from "./session";
import { estimate1RM, type SetType } from "./training";
import { toDisplayWeight, type WeightUnit } from "./units";

/**
 * Resumo de um treino concluído e evolução por exercício (puras, sem React).
 * Regras: só séries concluídas; aquecimento nunca entra em carga, 1RM, volume, séries nem recordes;
 * a primeira vez de um exercício não gera recorde (mesmas regras do banco: finish_workout,
 * get_exercise_history e get_training_days).
 */

/* ---------------------------------------------------------------------
 * Textos do resumo
 * --------------------------------------------------------------------- */

/** "Sex, 9 out · 18:42" (data local do treino + hora local de início). */
export function workoutDateTimeLabel(performedOn: string, startedAt: string): string {
  return `${formatShortDate(fromLocalISODate(performedOn))} · ${format(new Date(startedAt), "HH:mm")}`;
}

/** "Tempo efetivo · 2 pausas · 6:30 parado"; sem pausa → null. */
export function pauseSummaryLabel(pauseCount: number, pausedSeconds: number): string | null {
  if (pauseCount <= 0) return null;
  return `Tempo efetivo · ${plural(pauseCount, "pausa", "pausas")} · ${formatClock(pausedSeconds)} parado`;
}

/** "Recorde pessoal" · "2 recordes pessoais". */
export function recordsTitle(count: number): string {
  return count === 1 ? "Recorde pessoal" : `${count} recordes pessoais`;
}

/** Pausas de um treino pelos períodos ativos (workout_active_periods): n períodos = n − 1 pausas. */
export function pauseStats(periodCount: number, elapsedSeconds: number, activeSeconds: number): { pauseCount: number; pausedSeconds: number } {
  return { pauseCount: Math.max(0, periodCount - 1), pausedSeconds: Math.max(0, elapsedSeconds - activeSeconds) };
}

/** Série concluída que vale para recordes (sem aquecimento, com carga e reps). */
export interface PerformedSet {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
}

const isWorkingSet = (s: PerformedSet): s is PerformedSet & { weightKg: number; reps: number } =>
  s.setType !== "warmup" && s.weightKg !== null && s.reps !== null;

/** Melhor série por carga: maior carga e, no empate, mais repetições (aquecimento não conta). */
export function bestLoadSet(sets: readonly PerformedSet[]): { weightKg: number; reps: number } | null {
  let best: { weightKg: number; reps: number } | null = null;
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    if (!best || s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps)) best = { weightKg: s.weightKg, reps: s.reps };
  }
  return best;
}

/** Série que deu o maior 1RM estimado (Epley, igual ao Postgres). */
export function best1RMSet(sets: readonly PerformedSet[]): { weightKg: number; reps: number; oneRmKg: number } | null {
  let best: { weightKg: number; reps: number; oneRmKg: number } | null = null;
  for (const s of sets) {
    if (!isWorkingSet(s)) continue;
    const value = estimate1RM(s.weightKg, s.reps);
    if (value !== null && (!best || value > best.oneRmKg)) best = { weightKg: s.weightKg, reps: s.reps, oneRmKg: value };
  }
  return best;
}

/**
 * Índice da série marcada como recorde no resumo: a primeira série cujo 1RM estimado é o do
 * recorde. null = sem recorde.
 */
export function recordSetIndex(sets: readonly PerformedSet[], record1RmKg: number | null): number | null {
  if (record1RmKg === null) return null;
  const index = sets.findIndex((s) => isWorkingSet(s) && estimate1RM(s.weightKg, s.reps) === record1RmKg);
  return index === -1 ? null : index;
}

/* ---------------------------------------------------------------------
 * Evolução por exercício
 * --------------------------------------------------------------------- */

/** Números de um treino para um exercício (get_exercise_history + séries do treino). */
export interface ExerciseSessionPoint {
  sessionId: string;
  performedOn: string;
  /** Término do treino (desempate no mesmo dia). */
  finishedAt: string | null;
  sessionName: string;
  maxWeightKg: number;
  /** Repetições da melhor série com a carga máxima. */
  repsAtMax: number | null;
  best1RMKg: number | null;
  /** Série que gerou o melhor 1RM. */
  best1RMSet: { weightKg: number; reps: number } | null;
  volumeKg: number;
  setCount: number;
}

export interface ExerciseSessionEvolution extends ExerciseSessionPoint {
  /** Recordes batidos neste treino (comparado a todos os ANTERIORES; o primeiro nunca é recorde). */
  records: { load: boolean; oneRm: boolean; volume: boolean };
}

/** Ordem cronológica: data local e, no mesmo dia, horário de término. */
export function sortSessionsAsc<T extends { performedOn: string; finishedAt: string | null; sessionId: string }>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) =>
      a.performedOn.localeCompare(b.performedOn) ||
      (a.finishedAt ?? "").localeCompare(b.finishedAt ?? "") ||
      a.sessionId.localeCompare(b.sessionId),
  );
}

/** Marca, em cada treino, os recordes de carga, 1RM e volume em relação aos treinos anteriores. */
export function withRecords(points: readonly ExerciseSessionPoint[]): ExerciseSessionEvolution[] {
  let maxLoad = -Infinity;
  let max1RM = -Infinity;
  let maxVolume = -Infinity;
  return sortSessionsAsc(points).map((p, i) => {
    const first = i === 0;
    const records = {
      load: !first && p.maxWeightKg > maxLoad,
      oneRm: !first && p.best1RMKg !== null && p.best1RMKg > max1RM,
      volume: !first && p.volumeKg > maxVolume,
    };
    maxLoad = Math.max(maxLoad, p.maxWeightKg);
    if (p.best1RMKg !== null) max1RM = Math.max(max1RM, p.best1RMKg);
    maxVolume = Math.max(maxVolume, p.volumeKg);
    return { ...p, records };
  });
}

export interface PersonalBests {
  /** Maior carga (empate: mais repetições; depois o mais antigo). */
  load: ExerciseSessionEvolution;
  oneRm: ExerciseSessionEvolution | null;
  volume: ExerciseSessionEvolution;
}

/** Recordes pessoais do exercício (o treino em que cada um foi feito abre o resumo). */
export function personalBests(sessions: readonly ExerciseSessionEvolution[]): PersonalBests | null {
  const [first] = sessions;
  if (!first) return null;
  let load = first;
  let oneRm: ExerciseSessionEvolution | null = null;
  let volume = first;
  for (const s of sessions) {
    if (s.maxWeightKg > load.maxWeightKg || (s.maxWeightKg === load.maxWeightKg && (s.repsAtMax ?? 0) > (load.repsAtMax ?? 0))) load = s;
    if (s.best1RMKg !== null && (oneRm === null || s.best1RMKg > (oneRm.best1RMKg ?? -Infinity))) oneRm = s;
    if (s.volumeKg > volume.volumeKg) volume = s;
  }
  return { load, oneRm, volume };
}

export type EvolutionMetric = "carga" | "1rm" | "volume";
export type EvolutionPeriod = "3m" | "6m" | "1a" | "tudo";

export const EVOLUTION_METRICS: ReadonlyArray<{ value: EvolutionMetric; label: string; name: string; footnote: string }> = [
  { value: "carga", label: "Carga máx.", name: "Carga máxima", footnote: "Maior carga de cada treino. Só séries concluídas, sem aquecimento." },
  { value: "1rm", label: "1RM est.", name: "1RM estimado", footnote: "1RM estimado pela fórmula de Epley, com a melhor série de cada treino. Sem aquecimento." },
  { value: "volume", label: "Volume", name: "Volume por treino", footnote: "Volume = carga × repetições das séries concluídas, sem aquecimento." },
];

export const EVOLUTION_PERIODS: ReadonlyArray<{ value: EvolutionPeriod; label: string; months: number | null }> = [
  { value: "3m", label: "3 meses", months: 3 },
  { value: "6m", label: "6 meses", months: 6 },
  { value: "1a", label: "1 ano", months: 12 },
  { value: "tudo", label: "Tudo", months: null },
];

export function isEvolutionMetric(value: string | null | undefined): value is EvolutionMetric {
  return EVOLUTION_METRICS.some((m) => m.value === value);
}

export function isEvolutionPeriod(value: string | null | undefined): value is EvolutionPeriod {
  return EVOLUTION_PERIODS.some((p) => p.value === value);
}

/** Valor do treino na métrica, em kg (null = sem dado, ex.: 1RM de série sem reps). */
export function metricValueKg(s: ExerciseSessionPoint, metric: EvolutionMetric): number | null {
  return metric === "carga" ? s.maxWeightKg : metric === "1rm" ? s.best1RMKg : s.volumeKg;
}

export function isMetricRecord(s: ExerciseSessionEvolution, metric: EvolutionMetric): boolean {
  return metric === "carga" ? s.records.load : metric === "1rm" ? s.records.oneRm : s.records.volume;
}

/** Início do período ("yyyy-MM-dd"): hoje − N meses; "tudo" = primeiro treino. */
export function evolutionPeriodStart(period: EvolutionPeriod, today: Date, firstPerformedOn: string | null): string {
  const months = EVOLUTION_PERIODS.find((p) => p.value === period)?.months ?? null;
  if (months === null) return firstPerformedOn ?? toLocalISODate(today);
  return toLocalISODate(addMonths(today, -months));
}

export interface EvolutionPoint {
  sessionId: string;
  performedOn: string;
  /** Dias desde o início do período (eixo X proporcional ao tempo). */
  day: number;
  /** Valor na unidade do usuário. */
  value: number;
  /** Linha de tendência (mínimos quadrados) na unidade do usuário. */
  trend: number | null;
  isRecord: boolean;
  session: ExerciseSessionEvolution;
}

export interface EvolutionSeries {
  start: string;
  end: string;
  /** Dias do início ao fim do período (largura do eixo X). */
  spanDays: number;
  points: EvolutionPoint[];
  /** Último − primeiro do período, na unidade do usuário; null com menos de 2 treinos. */
  delta: number | null;
}

/** Reta de tendência por mínimos quadrados; null com menos de 2 pontos. */
export function linearTrend(xs: readonly number[], ys: readonly number[]): Array<number | null> {
  const n = xs.length;
  if (n < 2) return xs.map(() => null);
  const mx = xs.reduce((a, x) => a + x, 0) / n;
  const my = ys.reduce((a, y) => a + y, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const slope = sxx === 0 ? 0 : xs.reduce((a, x, i) => a + (x - mx) * ((ys[i] ?? 0) - my), 0) / sxx;
  return xs.map((x) => Math.round((my + slope * (x - mx)) * 10) / 10);
}

/** Pontos do gráfico de um período (um por treino), na unidade do usuário. */
export function evolutionSeries(
  sessions: readonly ExerciseSessionEvolution[],
  metric: EvolutionMetric,
  period: EvolutionPeriod,
  today: Date,
  unit: WeightUnit,
): EvolutionSeries {
  const start = evolutionPeriodStart(period, today, sessions[0]?.performedOn ?? null);
  const end = toLocalISODate(today);
  const startDate = fromLocalISODate(start);
  const inPeriod = sessions.filter((s) => s.performedOn >= start && metricValueKg(s, metric) !== null);
  const days = inPeriod.map((s) => differenceInCalendarDays(fromLocalISODate(s.performedOn), startDate));
  const values = inPeriod.map((s) => toDisplayWeight(metricValueKg(s, metric), unit) ?? 0);
  const trend = linearTrend(days, values);
  const points = inPeriod.map((s, i) => ({
    sessionId: s.sessionId,
    performedOn: s.performedOn,
    day: days[i] ?? 0,
    value: values[i] ?? 0,
    trend: trend[i] ?? null,
    isRecord: isMetricRecord(s, metric),
    session: s,
  }));
  const first = values[0];
  const last = values.at(-1);
  return {
    start,
    end,
    spanDays: Math.max(1, differenceInCalendarDays(today, startDate)),
    points,
    delta: values.length >= 2 && first !== undefined && last !== undefined ? Math.round((last - first) * 10) / 10 : null,
  };
}

/** "em 3 meses" · "em 1 ano" · "desde mar 2026". */
export function periodPhrase(period: EvolutionPeriod, start: string): string {
  if (period === "3m") return "em 3 meses";
  if (period === "6m") return "em 6 meses";
  if (period === "1a") return "em 1 ano";
  return `desde ${format(fromLocalISODate(start), "MMM yyyy", { locale: ptBR }).replace(".", "")}`;
}

/** "+7,5 kg em 3 meses" · "−2 kg em 6 meses" · "Sem variação em 3 meses"; volume sem casas. */
export function evolutionDeltaLabel(delta: number, metric: EvolutionMetric, unit: WeightUnit, period: EvolutionPeriod, start: string): string {
  const phrase = periodPhrase(period, start);
  if (delta === 0) return `Sem variação ${phrase}`;
  const digits = metric === "volume" ? 0 : 1;
  return `${delta > 0 ? "+" : MINUS_SIGN}${formatNumber(Math.abs(delta), digits)} ${unit} ${phrase}`;
}

/** "Carga máxima, últimos 3 meses: 9 treinos, de 75 a 82,5 kg, alta de 7,5 kg, 2 recordes pessoais." */
export function evolutionChartSummary(series: EvolutionSeries, metric: EvolutionMetric, period: EvolutionPeriod, unit: WeightUnit): string {
  const name = EVOLUTION_METRICS.find((m) => m.value === metric)?.name ?? "";
  const months = EVOLUTION_PERIODS.find((p) => p.value === period)?.months ?? null;
  const periodText = months === null ? "todo o período" : months === 12 ? "últimos 12 meses" : `últimos ${months} meses`;
  const digits = metric === "volume" ? 0 : 1;
  const pts = series.points;
  const parts = [`${name}, ${periodText}: ${plural(pts.length, "treino", "treinos")}`];
  const first = pts[0];
  const last = pts.at(-1);
  if (first && last) parts.push(`de ${formatNumber(first.value, digits)} a ${formatNumber(last.value, digits)} ${unit}`);
  if (series.delta) parts.push(`${series.delta > 0 ? "alta" : "queda"} de ${formatNumber(Math.abs(series.delta), digits)} ${unit}`);
  const records = pts.filter((p) => p.isRecord).length;
  if (records) parts.push(records === 1 ? "1 recorde pessoal" : `${records} recordes pessoais`);
  return `${parts.join(", ")}. Use as setas para ver cada treino.`;
}

/** Busca de exercícios: filtra por grupo e texto (sem acento), mais recentes primeiro. */
export interface TrainedExerciseLike {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  lastPerformedOn: string;
}

export function filterTrainedExercises<T extends TrainedExerciseLike>(items: readonly T[], query: string, group: string | null): T[] {
  const byRecent = items
    .filter((e) => !group || e.muscleGroup === group)
    .sort((a, b) => b.lastPerformedOn.localeCompare(a.lastPerformedOn) || a.name.localeCompare(b.name, "pt-BR"));
  // Busca flexível por pedaços de palavras; com o mesmo grau de parecença, os mais recentes primeiro.
  return searchFilter(byRecent, query, (e) => [e.name]);
}

/** Marca de cada série no resumo: número para as normais (1, 2, 3…) e letra para os tipos (A, D, F). */
export function setMarks(types: readonly SetType[], letters: Record<Exclude<SetType, "normal">, string> = { warmup: "A", dropset: "D", failure: "F" }): string[] {
  let n = 0;
  return types.map((t) => (t === "normal" ? String(++n) : letters[t]));
}
