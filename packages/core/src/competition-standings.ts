/**
 * Classificação da competição paginada no banco (get_competition_standings e afins). O banco ordena
 * com a mesma regra de rankCompetitors; aqui ficam os tipos, o tamanho da página e as contas da
 * tela (quem está à frente e atrás, páginas, quem entra no gráfico), sem nada de React.
 */
import { formatNumber } from "./format";
import type { RankedCompetitor } from "./competition-ranking";

/** Pessoas por página no ranking (o banco aceita até 50). */
export const COMPETITION_PAGE_SIZE = 10;
/** Quantas posições à frente e atrás vêm com a sua (cartão "Sua posição"; empates pedem folga). */
export const STANDINGS_NEAR_RADIUS = 3;
/** Pessoas do topo que aparecem no gráfico da corrida junto com você e o adversário. */
const CHART_TOP = 3;

export interface CompetitionStanding extends RankedCompetitor {
  /** Ordem na classificação (1, 2, 3…), sem empate: a posição da linha na lista. */
  position: number;
}

export interface CompetitionStandingsPage {
  items: CompetitionStanding[];
  /** Total de pessoas na classificação (você incluído). */
  total: number;
}

/** Quantas páginas cabem no total (no mínimo 1). */
export function standingsPageCount(total: number, pageSize: number = COMPETITION_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** "11–20 de 1.000" (quem está na página). */
export function standingsPageLabel(page: number, total: number, pageSize: number = COMPETITION_PAGE_SIZE): string {
  if (total === 0) return "Ninguém na competição";
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  return `${formatNumber(first, 0)}–${formatNumber(last, 0)} de ${formatNumber(total, 0)}`;
}

/** Página em que uma posição fica (para abrir o ranking onde você está). */
export function pageOfPosition(position: number, pageSize: number = COMPETITION_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(position / pageSize));
}

export type PaginationSlot = number | "ellipsis";

/**
 * Números da paginação: sempre a primeira, a última e as vizinhas da atual; o resto vira "…".
 * Ex.: página 6 de 100 → 1 … 5 6 7 … 100.
 */
export function paginationSlots(current: number, totalPages: number): PaginationSlot[] {
  const pages = new Set([1, totalPages, current - 1, current, current + 1].filter((p) => p >= 1 && p <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const slots: PaginationSlot[] = [];
  sorted.forEach((page, index) => {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) slots.push("ellipsis");
    slots.push(page);
  });
  return slots;
}

export interface StandingContext {
  me: CompetitionStanding;
  /** Mais perto à frente com valor maior (quem você pode passar). */
  above: CompetitionStanding | null;
  /** Mais perto atrás com valor menor. */
  below: CompetitionStanding | null;
  /** Quem vem logo depois de você (para o "Você está na frente"). */
  runnerUp: CompetitionStanding | null;
  total: number;
}

/** Sua situação a partir de você e das posições vizinhas (get_competition_standings_near_me). */
export function standingContext(near: readonly CompetitionStanding[], total: number): StandingContext | null {
  const me = near.find((s) => s.isMe);
  if (!me) return null;
  const ahead = near.filter((s) => s.position < me.position).sort((a, b) => b.position - a.position);
  const behind = near.filter((s) => s.position > me.position).sort((a, b) => a.position - b.position);
  return {
    me,
    above: ahead.find((s) => s.value > me.value) ?? null,
    below: behind.find((s) => s.value < me.value) ?? null,
    runnerUp: behind[0] ?? null,
    total,
  };
}

/** Quem entra no gráfico da corrida: você, o adversário e o topo (sem repetir; no máximo 5). */
export function chartParticipantIds(meId: string, rivalId: string | null, top: readonly CompetitionStanding[]): string[] {
  const ids = [meId, ...(rivalId ? [rivalId] : []), ...top.slice(0, CHART_TOP).map((s) => s.userId)];
  return [...new Set(ids)];
}

/** Adversário padrão: quem está logo à frente; sendo o 1º, quem vem logo atrás. */
export function defaultRival(context: StandingContext | null): CompetitionStanding | null {
  if (!context) return null;
  return context.above ?? context.runnerUp;
}

/** Numera uma classificação já ordenada (rankCompetitors) como o banco faz: 1, 2, 3… */
export function toStandings(ranked: readonly RankedCompetitor[]): CompetitionStanding[] {
  return ranked.map((competitor, index) => ({ ...competitor, position: index + 1 }));
}
