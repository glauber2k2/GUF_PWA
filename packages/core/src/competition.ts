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
  sessionsForMaxConstancy: number;
  constancyMax: number;
  minMinutes: number;
  maxMinutes: number;
  bonusPerWeek: number;
  bonusMax: number;
  recordPoints: number;
  recordsMax: number;
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

/** Regras da pontuação em frases curtas, montadas com os parâmetros do servidor ("Como funciona"). */
export function scoringRules(params: CompetitionParameters): string[] {
  const perSession = params.constancyMax / params.sessionsForMaxConstancy;
  const weekMax = params.constancyMax + params.bonusMax + params.recordsMax + params.volumeMax;
  return [
    `Vale o treino com pelo menos ${formatNumber(params.minMinutes, 0)} minutos de tempo efetivo; conta no máximo um treino por dia.`,
    `Constância (o que mais pesa): ${formatNumber(perSession, 0)} pontos por treino válido na semana, até ${formatNumber(params.constancyMax, 0)} pontos com ${params.sessionsForMaxConstancy} treinos.`,
    `Sequência: semana com ${params.sessionsForMaxConstancy} ou mais treinos válidos rende ${formatNumber(params.bonusPerWeek, 0)} pontos multiplicados pelas semanas cumpridas seguidas, até ${formatNumber(params.bonusMax, 0)} pontos.`,
    `Recordes: ${formatNumber(params.recordPoints, 0)} pontos por recorde batido na semana (maior 1RM estimado: mais carga ou mais repetições com a mesma carga), até ${formatNumber(params.recordsMax, 0)} pontos.`,
    `Volume: até ${formatNumber(params.volumeMax, 0)} pontos, comparando o volume da semana com a sua média das últimas ${params.volumeWindowWeeks} semanas com treino. Quem mantém ou aumenta o próprio volume ganha tudo.`,
    `Máximo de ${formatNumber(weekMax, 0)} pontos por semana.`,
    "Empate: vence quem tem mais semanas cumpridas, depois mais treinos válidos e depois mais volume no período.",
  ];
}

/** Duelo com uma pessoa (botão de espadas do perfil dela): `/competicao/duelo?id=<userId>`. */
export function duelPath(userId: string): string {
  return `/competicao/duelo?id=${encodeURIComponent(userId)}`;
}
