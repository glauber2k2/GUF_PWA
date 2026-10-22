import type { EvolutionPeriod as ChartPeriod } from "@guf/core";

export type EvolutionPeriod = "1M" | "3M" | "6M";

export const EVOLUTION_WEEKS: Record<EvolutionPeriod, number> = { "1M": 5, "3M": 13, "6M": 26 };

/** Mesmo período da evolução por exercício, para medir o início do gráfico pela regra do plano. */
export const EVOLUTION_CHART_PERIOD: Record<EvolutionPeriod, ChartPeriod> = { "1M": "1m", "3M": "3m", "6M": "6m" };

export const SELF_EVOLUTION_PERIODS: readonly EvolutionPeriod[] = ["1M", "3M", "6M"];

/** O banco só entrega o mês atual do gráfico de outra pessoa (`member_history_from`): períodos maiores mostrariam o mesmo. */
export const MEMBER_EVOLUTION_PERIODS: readonly EvolutionPeriod[] = ["1M"];

export const PREFERRED_SELF_PERIOD: EvolutionPeriod = "3M";
