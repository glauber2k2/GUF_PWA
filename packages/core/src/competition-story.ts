/**
 * Competição nas imagens de compartilhamento (Claude Design "PNGs Competicao e Cardio"): só o SEU
 * progresso na temporada (posição, pontos, de onde vieram e quanto falta), sem nome nem foto de outros
 * competidores. Textos e números prontos para a arte; puro, sem React.
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { COMPETITION_ALERT_GAP } from "./competition";
import type { CompetitionStanding } from "./competition-standings";
import { POINT_SOURCE_LABELS, pointsDeltaLabel, type PointSource, type StatementWeek } from "./competition-statement";
import { addLocalDays, formatShortDate, toLocalISODate } from "./dates";
import { formatNumber, plural } from "./format";

const DAYS_PER_WEEK = 7;
/** Pódio do selo "Top 3" (com menos gente que isso, o selo não diz nada). */
const TOP_SPOTS = 3;

export interface CompetitionStoryInput {
  /** Você na classificação da temporada por pontos. */
  me: CompetitionStanding;
  /** 1º da classificação (pode ser você). */
  leader: CompetitionStanding | null;
  /** Quem vem logo depois de você. */
  runnerUp: CompetitionStanding | null;
  /** Pessoas na competição (você incluído). */
  total: number;
  /** Suas semanas da temporada (get_my_points_statement). */
  weeks: readonly StatementWeek[];
  /** Temporada (1º dia do mês). */
  season: Date;
  now: Date;
}

export interface CompetitionStoryWeek {
  /** "SEM 1" */
  label: string;
  /** "380" */
  pointsText: string;
  /** Altura da barra (0–100) em relação à melhor semana. */
  heightPct: number;
  isBest: boolean;
}

export interface CompetitionStorySource {
  source: PointSource;
  label: string;
  /** "12 dias com treino válido" */
  detail: string;
  /** "+180" */
  points: string;
}

export interface CompetitionStory {
  /** "OUT" */
  monthShort: string;
  /** "Outubro 2026" */
  monthLabel: string;
  /** "Sáb, 18 out" */
  dateLabel: string;
  /** "2026-10-18" (nome do arquivo) */
  fileDate: string;
  /** Posição com empate (1 = líder). */
  position: number;
  total: number;
  /** "1.240" */
  pointsText: string;
  /** Posições que você subiu no fim da temporada (0 = não subiu). */
  climbed: number;
  previousPosition: number;
  /** Pontos que faltam para o 1º; null quando você lidera. */
  gapToFirst: number | null;
  /** Você até o 1º (0–100), para a barra de progresso. */
  progressToFirstPct: number;
  /** Sua vantagem sobre o 2º quando lidera; null fora da liderança. */
  leadOverSecond: number | null;
  /** Liderança por menos de COMPETITION_ALERT_GAP pontos. */
  isCloseLead: boolean;
  weeks: CompetitionStoryWeek[];
  /** "Melhor semana da temporada" · "Melhor semana: SEM 2" */
  bestWeekText: string | null;
  /** Pontos somados semana a semana (0–100 no eixo do gráfico). */
  cumulativePct: number[];
  /** Quanto o total cresceu na última semana: "+38%". */
  lastWeekGrowth: string | null;
  sources: CompetitionStorySource[];
  /** Semana atual da temporada (1, 2…). */
  weekNumber: number;
  /** Último dia da temporada: tempo até fechar, congelado na hora da imagem. */
  countdown: Array<{ value: string; unit: string }> | null;
  hasPoints: boolean;
  isTopThree: boolean;
  isLeader: boolean;
}

/** Fim da temporada: o último sábado do mês (semanas cujo sábado cai no mês), às 23:59:59. */
function seasonEnd(season: Date): Date {
  const lastDay = new Date(season.getFullYear(), season.getMonth() + 1, 0);
  const lastSaturday = addLocalDays(lastDay, -((lastDay.getDay() + 1) % DAYS_PER_WEEK));
  return new Date(lastSaturday.getFullYear(), lastSaturday.getMonth(), lastSaturday.getDate(), 23, 59, 59);
}

const twoDigits = (n: number) => String(n).padStart(2, "0");

function countdownTo(end: Date, now: Date): CompetitionStory["countdown"] {
  if (toLocalISODate(end) !== toLocalISODate(now) || now > end) return null;
  const seconds = Math.floor((end.getTime() - now.getTime()) / 1000);
  return [
    { value: twoDigits(Math.floor(seconds / 3600)), unit: "HORAS" },
    { value: twoDigits(Math.floor((seconds % 3600) / 60)), unit: "MIN" },
    { value: twoDigits(seconds % 60), unit: "SEG" },
  ];
}

function sourcesOf(weeks: readonly StatementWeek[]): CompetitionStorySource[] {
  const sum = (pick: (w: StatementWeek) => number) => weeks.reduce((n, w) => n + pick(w), 0);
  const days = sum((w) => w.validSessions);
  const fulfilled = weeks.filter((w) => w.fulfilled).length;
  const records = sum((w) => w.records);
  const rows: Array<[PointSource, number, string]> = [
    ["constancy", sum((w) => w.constancyPoints), plural(days, "dia com treino válido", "dias com treino válido")],
    ["streak", sum((w) => w.bonusPoints), plural(fulfilled, "semana cumprida", "semanas cumpridas")],
    ["records", sum((w) => w.recordPoints), plural(records, "recorde batido", "recordes batidos")],
    ["volume", sum((w) => w.volumePoints), "Volume contra a sua média"],
  ];
  return rows
    .filter(([, points]) => points > 0)
    .map(([source, points, detail]) => ({ source, label: POINT_SOURCE_LABELS[source], detail, points: pointsDeltaLabel(points) }));
}

function weeksOf(weeks: readonly StatementWeek[]): CompetitionStoryWeek[] {
  const best = Math.max(0, ...weeks.map((w) => w.points));
  return weeks.map((w, i) => ({
    label: `SEM ${i + 1}`,
    pointsText: w.points > 0 ? formatNumber(w.points, 0) : "",
    heightPct: best > 0 ? Math.round((w.points / best) * 100) : 0,
    isBest: best > 0 && w.points === best,
  }));
}

function bestWeekText(weeks: readonly CompetitionStoryWeek[]): string | null {
  const bestIndex = weeks.findIndex((w) => w.isBest);
  if (bestIndex < 0) return null;
  return bestIndex === weeks.length - 1 ? "Melhor semana da temporada" : `Melhor semana: ${weeks[bestIndex]!.label}`;
}

/** Pontos somados semana a semana, na escala do maior total (o gráfico sobe com cada semana). */
function cumulativeOf(weeks: readonly StatementWeek[]): number[] {
  const totals = weeks.reduce<number[]>((acc, w) => [...acc, (acc.at(-1) ?? 0) + w.points], []);
  const top = totals.at(-1) ?? 0;
  return top > 0 ? totals.map((t) => Math.round((t / top) * 100)) : [];
}

function lastWeekGrowthOf(weeks: readonly StatementWeek[]): string | null {
  const last = weeks.at(-1)?.points ?? 0;
  const before = weeks.slice(0, -1).reduce((n, w) => n + w.points, 0);
  if (last <= 0 || before <= 0) return null;
  return `+${formatNumber((last / before) * 100, 0)}%`;
}

function shortMonth(date: Date): string {
  return format(date, "MMM", { locale: ptBR }).replace(".", "").toUpperCase();
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Sua competição da temporada pronta para as imagens.
 * @returns posição, pontos, semanas, origens dos pontos e o que cada modelo precisa saber
 */
export function buildCompetitionStory(input: CompetitionStoryInput): CompetitionStory {
  const { me, leader, runnerUp, total, season, now } = input;
  const weeks = [...input.weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  const points = me.value;
  const isLeader = me.rank === 1;
  const gap = leader && !isLeader ? leader.value - points : 0;
  const lead = isLeader && runnerUp ? points - runnerUp.value : 0;
  const storyWeeks = weeksOf(weeks);
  return {
    monthShort: shortMonth(season),
    monthLabel: `${capitalized(format(season, "MMMM", { locale: ptBR }))} ${season.getFullYear()}`,
    dateLabel: formatShortDate(now),
    fileDate: toLocalISODate(now),
    position: me.rank,
    total,
    pointsText: formatNumber(points, 0),
    climbed: Math.max(0, me.previousRank - me.rank),
    previousPosition: me.previousRank,
    gapToFirst: gap > 0 ? gap : null,
    progressToFirstPct: leader && leader.value > 0 ? Math.min(100, Math.round((points / leader.value) * 100)) : 100,
    leadOverSecond: lead > 0 ? lead : null,
    isCloseLead: lead > 0 && lead < COMPETITION_ALERT_GAP,
    weeks: storyWeeks,
    bestWeekText: bestWeekText(storyWeeks),
    cumulativePct: cumulativeOf(weeks),
    lastWeekGrowth: lastWeekGrowthOf(weeks),
    sources: sourcesOf(weeks),
    weekNumber: Math.max(1, weeks.length),
    countdown: countdownTo(seasonEnd(season), now),
    hasPoints: points > 0,
    isTopThree: me.rank <= TOP_SPOTS && total > TOP_SPOTS,
    isLeader: isLeader && total > 1 && points > 0,
  };
}

/** Nome do arquivo baixado: "guf-competicao-04-2026-10-18.png". */
export function competitionStoryFileName(modelId: string, date: string): string {
  return `guf-competicao-${modelId}-${date}.png`;
}
