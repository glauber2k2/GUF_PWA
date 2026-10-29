import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { addLocalDays, startOfLocalWeek } from "./dates";
import { formatNumber } from "./format";

/**
 * Textos e datas da competição (puros, sem React). Os pontos de cada semana são calculados SÓ no
 * servidor (competition_week_scores); ordem do ranking e séries ficam em competition-ranking.ts.
 */

/** Parâmetros públicos da pontuação (tabela competition_parameters), já convertidos para número. */
export interface CompetitionParameters {
  effectiveFrom: string;
  /** Dias com treino válido para a semana contar como cumprida (sequência). */
  fulfilledWeekDays: number;
  /** Pontos por dia com treino válido, sem teto de dias. */
  constancyPointsPerDay: number;
  minMinutes: number;
  maxMinutes: number;
  bonusPerWeek: number;
  bonusMax: number;
  recordPoints: number;
  /** Teto de pontos de recordes na semana; null = sem teto. */
  recordsMax: number | null;
  volumeMax: number;
  volumeWindowWeeks: number;
}

/** Temporada (1º dia do mês) da semana que contém a data: o mês do sábado em que a semana termina. */
export function seasonOf(date: Date): Date {
  const saturday = addLocalDays(startOfLocalWeek(date), 6);
  return new Date(saturday.getFullYear(), saturday.getMonth(), 1);
}

/** Temporada deslocada em meses (navegação entre temporadas). */
export function shiftSeason(season: Date, months: number): Date {
  return new Date(season.getFullYear(), season.getMonth() + months, 1);
}

/** "Outubro de 2026" */
export function seasonLabel(season: Date): string {
  const label = format(season, "MMMM 'de' yyyy", { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "1º", "2º"… */
export function rankLabel(position: number): string {
  return `${position}º`;
}

/** "112 pts" · "1 pt" */
/** Distância em pontos que dispara o aviso "está chegando" (igual a competition_alert_state no banco). */
export const COMPETITION_ALERT_GAP = 20;

export function pointsLabel(points: number): string {
  return `${formatNumber(points, 0)} ${points === 1 ? "pt" : "pts"}`;
}

/** "até 25" ou "sem limite" (teto nulo). */
function pointsCapLabel(max: number | null): string {
  return max === null ? "sem limite" : `até ${formatNumber(max, 0)}`;
}

/** Fim da regra dos recordes: "até 25 pontos" ou "sem limite de recordes". */
function recordsCapRule(max: number | null): string {
  return max === null ? "sem limite de recordes" : `até ${formatNumber(max, 0)} pontos`;
}

/** Resumo de uma linha embaixo do ranking; sem parâmetros (ainda carregando), só as partes. */
export function scoringSummary(params: CompetitionParameters | undefined): string {
  if (!params) return "Pontos da semana = constância + sequência + recordes + volume.";
  return `Pontos da semana = constância (${formatNumber(params.constancyPointsPerDay, 0)} por dia treinado) + sequência (até ${formatNumber(params.bonusMax, 0)}) + recordes (${pointsCapLabel(params.recordsMax)}) + volume (até ${formatNumber(params.volumeMax, 0)}).`;
}

/** Regras da pontuação em frases curtas, montadas com os parâmetros do servidor ("Como funciona"). */
export function scoringRules(params: CompetitionParameters): string[] {
  return [
    `Vale o treino com pelo menos ${formatNumber(params.minMinutes, 0)} minutos de tempo efetivo; conta no máximo um treino por dia.`,
    `Constância (o que mais pesa): ${formatNumber(params.constancyPointsPerDay, 0)} pontos por dia com treino válido, todos os dias da semana (sem limite de dias).`,
    `Sequência: semana com ${params.fulfilledWeekDays} ou mais dias de treino válido rende ${formatNumber(params.bonusPerWeek, 0)} pontos multiplicados pelas semanas cumpridas seguidas, até ${formatNumber(params.bonusMax, 0)} pontos.`,
    `Recordes: ${formatNumber(params.recordPoints, 0)} pontos por recorde batido na semana, ${recordsCapRule(params.recordsMax)}. Na força, o maior 1RM estimado (mais carga ou mais repetições com a mesma carga); no cardio, o melhor ritmo (séries de 1 km ou mais) ou a maior distância. Treino só de cardio precisa de pelo menos ${formatNumber(params.minMinutes, 0)} minutos para o recorde contar.`,
    `Volume: até ${formatNumber(params.volumeMax, 0)} pontos, comparando o volume da semana com a sua média das últimas ${params.volumeWindowWeeks} semanas com treino. Quem mantém ou aumenta o próprio volume ganha tudo.`,
    "Empate: vence quem tem mais semanas cumpridas, depois mais treinos válidos e depois mais volume no período.",
  ];
}

/** Duelo com uma pessoa (botão de espadas do perfil dela): `/competicao/duelo?id=<userId>`. */
export function duelPath(userId: string): string {
  return `/competicao/duelo?id=${encodeURIComponent(userId)}`;
}
