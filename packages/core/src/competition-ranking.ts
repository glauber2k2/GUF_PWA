import { addLocalDays, fromLocalISODate, startOfLocalWeek, toLocalISODate } from "./dates";
import { seasonOf } from "./competition";

/**
 * Ranking da competição a partir dos números do servidor (pontos por semana; treinos, volume e
 * recordes por dia). Puro e determinístico: o mesmo dado sempre gera a mesma ordem.
 */

export type CompetitionMetric = "points" | "volume" | "workouts" | "records";
export type CompetitionPeriod = "month" | "3m" | "6m" | "1y" | "custom";

/** Datas locais "yyyy-MM-dd", inclusivas. */
export interface CompetitionRange {
  from: string;
  to: string;
}

export interface CompetitionParticipant {
  userId: string;
  handle: string;
  name: string | null;
  avatarUrl: string | null;
  isMe: boolean;
  /** Semanas seguidas com pelo menos 1 treino (mesma regra da sequência do app). */
  currentStreak: number;
}

export interface CompetitionWeekScore {
  userId: string;
  weekStart: string;
  points: number;
  /** Partes dos pontos da semana (já arredondados pelo servidor). */
  constancyPoints: number;
  bonusPoints: number;
  recordPoints: number;
  volumePoints: number;
  validSessions: number;
  fulfilled: boolean;
}

export interface CompetitionDayStat {
  userId: string;
  day: string;
  workouts: number;
  volumeKg: number;
  records: number;
}

export interface CompetitorTotals {
  points: number;
  workouts: number;
  volumeKg: number;
  records: number;
  fulfilledWeeks: number;
  validSessions: number;
}

export interface RankedCompetitor extends CompetitionParticipant {
  totals: CompetitorTotals;
  value: number;
  rank: number;
  previousRank: number;
}

/** Limite do período personalizado (igual ao servidor). */
export const COMPETITION_MAX_RANGE_DAYS = 400;
/** Até este tamanho o gráfico é por dia; acima, por semana. */
export const COMPETITION_DAILY_CHART_MAX_DAYS = 45;
/** A posição anterior é a de quando 70% do período tinha passado. */
const PREVIOUS_RANK_FRACTION = 0.7;

const PERIOD_DAYS: Record<Exclude<CompetitionPeriod, "month" | "custom">, number> = { "3m": 90, "6m": 182, "1y": 364 };

const EMPTY_TOTALS: CompetitorTotals = { points: 0, workouts: 0, volumeKg: 0, records: 0, fulfilledWeeks: 0, validSessions: 0 };

/**
 * Período de datas. "Este mês" = temporada: semanas cujo sábado cai no mês (pode começar no
 * domingo do mês anterior), até hoje.
 */
export function competitionRange(period: CompetitionPeriod, today: Date, custom?: CompetitionRange): CompetitionRange {
  const to = toLocalISODate(today);
  if (period === "custom" && custom) return custom;
  if (period === "month" || period === "custom") {
    return { from: toLocalISODate(startOfLocalWeek(seasonOf(today))), to };
  }
  return { from: toLocalISODate(addLocalDays(today, -PERIOD_DAYS[period])), to };
}

/** Dias do período, contando as duas pontas. */
export function rangeDays(range: CompetitionRange): number {
  const ms = fromLocalISODate(range.to).getTime() - fromLocalISODate(range.from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Período personalizado válido: início antes do fim, fim até hoje e no máximo 400 dias. */
export function isValidCustomRange(range: CompetitionRange, today: Date): boolean {
  return range.from <= range.to && range.to <= toLocalISODate(today) && rangeDays(range) <= COMPETITION_MAX_RANGE_DAYS;
}

/** Pontos do gráfico: um por dia até 45 dias; senão um por semana (o último é sempre o fim). */
export function chartBuckets(range: CompetitionRange): { daily: boolean; dates: string[] } {
  const days = rangeDays(range);
  const start = fromLocalISODate(range.from);
  if (days <= COMPETITION_DAILY_CHART_MAX_DAYS) {
    return { daily: true, dates: Array.from({ length: days }, (_, i) => toLocalISODate(addLocalDays(start, i))) };
  }
  const dates: string[] = [];
  for (let i = 6; i < days; i += 7) dates.push(toLocalISODate(addLocalDays(start, i)));
  if (dates.at(-1) !== range.to) dates.push(range.to);
  return { daily: false, dates };
}

/** Somas de uma pessoa até a data (inclusive). Semana entra nos pontos quando começa até a data. */
export function competitorTotals(userId: string, weeks: readonly CompetitionWeekScore[], days: readonly CompetitionDayStat[], until?: string): CompetitorTotals {
  const totals = { ...EMPTY_TOTALS };
  for (const week of weeks) {
    if (week.userId !== userId || (until && week.weekStart > until)) continue;
    totals.points += week.points;
    totals.validSessions += week.validSessions;
    if (week.fulfilled) totals.fulfilledWeeks += 1;
  }
  for (const day of days) {
    if (day.userId !== userId || (until && day.day > until)) continue;
    totals.workouts += day.workouts;
    totals.volumeKg += day.volumeKg;
    totals.records += day.records;
  }
  return totals;
}

export function metricValue(totals: CompetitorTotals, metric: CompetitionMetric): number {
  if (metric === "points") return totals.points;
  if (metric === "volume") return totals.volumeKg;
  if (metric === "workouts") return totals.workouts;
  return totals.records;
}

/** Chaves de ordenação: a métrica; em pontos, o desempate da regra (semanas cumpridas, sessões válidas, volume). */
function sortKeys(totals: CompetitorTotals, metric: CompetitionMetric): number[] {
  const value = metricValue(totals, metric);
  return metric === "points" ? [value, totals.fulfilledWeeks, totals.validSessions, totals.volumeKg] : [value, totals.points];
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Posição de cada pessoa (empate total = mesma posição). */
function rankBy(participants: readonly CompetitionParticipant[], totalsOf: (userId: string) => CompetitorTotals, metric: CompetitionMetric): Map<string, number> {
  const keyed = participants.map((p) => ({ userId: p.userId, keys: sortKeys(totalsOf(p.userId), metric) }));
  keyed.sort((a, b) => compareKeys(a.keys, b.keys) || a.userId.localeCompare(b.userId));
  const ranks = new Map<string, number>();
  keyed.forEach((item, index) => {
    const previous = keyed[index - 1];
    const tied = previous && compareKeys(previous.keys, item.keys) === 0;
    ranks.set(item.userId, tied ? (ranks.get(previous.userId) ?? index + 1) : index + 1);
  });
  return ranks;
}

/** Data em que 70% do período tinha passado (base do "Subiu"/"Caiu"). */
export function previousRankCutoff(range: CompetitionRange): string {
  const offset = Math.max(0, Math.floor(rangeDays(range) * PREVIOUS_RANK_FRACTION) - 1);
  return toLocalISODate(addLocalDays(fromLocalISODate(range.from), offset));
}

/** Ranking ordenado com totais, valor da métrica, posição atual e anterior. */
export function rankCompetitors(
  participants: readonly CompetitionParticipant[],
  weeks: readonly CompetitionWeekScore[],
  days: readonly CompetitionDayStat[],
  metric: CompetitionMetric,
  range: CompetitionRange,
): RankedCompetitor[] {
  const cutoff = previousRankCutoff(range);
  const ranks = rankBy(participants, (id) => competitorTotals(id, weeks, days), metric);
  const previous = rankBy(participants, (id) => competitorTotals(id, weeks, days, cutoff), metric);
  return participants
    .map((p) => {
      const totals = competitorTotals(p.userId, weeks, days);
      return { ...p, totals, value: metricValue(totals, metric), rank: ranks.get(p.userId) ?? 0, previousRank: previous.get(p.userId) ?? 0 };
    })
    .sort((a, b) => a.rank - b.rank || Number(b.isMe) - Number(a.isMe));
}

/** Valor acumulado da métrica em cada ponto do gráfico. */
export function cumulativeSeries(userId: string, weeks: readonly CompetitionWeekScore[], days: readonly CompetitionDayStat[], metric: CompetitionMetric, dates: readonly string[]): number[] {
  return dates.map((date) => metricValue(competitorTotals(userId, weeks, days, date), metric));
}

/** Variação de posição: positivo = subiu. */
export function rankMovement(competitor: Pick<RankedCompetitor, "rank" | "previousRank">): number {
  return competitor.previousRank - competitor.rank;
}

/**
 * Quantos treinos faltam para cobrir a diferença, pela média da própria pessoa no período
 * (sem histórico, 1 treino por unidade de diferença em recordes e treinos). Null em recordes.
 */
export function workoutsToCover(gap: number, metric: CompetitionMetric, totals: CompetitorTotals): number | null {
  if (gap <= 0) return 0;
  if (metric === "records") return null;
  if (metric === "workouts") return gap;
  const sessions = metric === "points" ? totals.validSessions : totals.workouts;
  const total = metric === "points" ? totals.points : totals.volumeKg;
  const perWorkout = sessions > 0 && total > 0 ? total / sessions : null;
  return perWorkout ? Math.max(1, Math.ceil(gap / perWorkout)) : null;
}

/**
 * Só você e uma pessoa (duelo aberto pelo perfil dela); sem `rivalId`, todos os competidores.
 * @param rivalId id da pessoa do duelo
 */
export function headToHeadParticipants<T extends Pick<CompetitionParticipant, "userId" | "isMe">>(participants: readonly T[], rivalId: string | null): T[] {
  if (!rivalId) return [...participants];
  return participants.filter((p) => p.isMe || p.userId === rivalId);
}
