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
  effortMax: number;
  referenceLoad: number;
  minMinutes: number;
  maxMinutes: number;
  bonusPerWeek: number;
  bonusMax: number;
  rpeGap: number;
  rpeHighValue: number;
  rpeHighShare: number;
  rpeHighCap: number;
  rpeWindowDays: number;
}

/** Motivo do ajuste de RPE de uma sessão, como o banco devolve. */
export type RpeAdjustment = "above_average" | "high_share";

export const RPE_MIN = 1;
export const RPE_MAX = 10;

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
export function pointsLabel(points: number): string {
  return `${formatNumber(points, 0)} ${points === 1 ? "pt" : "pts"}`;
}

/** Explicação do ajuste automático de RPE (transparência da decisão automatizada, LGPD Art. 20). */
export function rpeAdjustmentText(adjustment: RpeAdjustment, informed: number, used: number, params: CompetitionParameters): string {
  const weeks = Math.round(params.rpeWindowDays / 7);
  if (adjustment === "high_share") {
    const share = Math.round(params.rpeHighShare * 100);
    return `Você marcou esforço ${params.rpeHighValue} ou mais em mais de ${share}% das sessões das últimas ${weeks} semanas. Esta sessão contou com esforço ${formatNumber(used)} no lugar de ${informed}.`;
  }
  return `O esforço ${informed} ficou ${formatNumber(params.rpeGap, 0)} ou mais pontos acima da sua média das últimas ${weeks} semanas. Esta sessão contou com a sua média (${formatNumber(used)}).`;
}

/** Regras da pontuação em frases curtas, montadas com os parâmetros do servidor ("Como funciona"). */
export function scoringRules(params: CompetitionParameters): string[] {
  const perSession = params.constancyMax / params.sessionsForMaxConstancy;
  const weeks = Math.round(params.rpeWindowDays / 7);
  return [
    `Vale o treino com pelo menos ${formatNumber(params.minMinutes, 0)} minutos de tempo efetivo; acima de ${formatNumber(params.maxMinutes, 0)} minutos, o excedente não conta.`,
    "Conta no máximo um treino por dia (o de maior carga).",
    `Constância: ${formatNumber(perSession, 0)} pontos por treino válido na semana, até ${formatNumber(params.constancyMax, 0)} pontos com ${params.sessionsForMaxConstancy} treinos.`,
    `Esforço: carga = esforço (1 a 10) × minutos. A soma da semana vale até ${formatNumber(params.effortMax, 0)} pontos ao chegar a ${formatNumber(params.referenceLoad, 0)}.`,
    `Sequência: semana com ${params.sessionsForMaxConstancy} ou mais treinos válidos rende ${formatNumber(params.bonusPerWeek, 0)} pontos multiplicados pelas semanas cumpridas seguidas, até ${formatNumber(params.bonusMax, 0)} pontos.`,
    `Esforço muito acima da sua média das últimas ${weeks} semanas é ajustado automaticamente, e você vê o motivo em cada treino.`,
    "Empate: vence quem tem mais semanas cumpridas, depois mais treinos válidos e depois mais carga na temporada.",
  ];
}
