"use client";

import { useState } from "react";
import { evolutionPeriodStart } from "@guf/core";
import { usePlanGate } from "@/features/plans";
import {
  EVOLUTION_CHART_PERIOD,
  MEMBER_EVOLUTION_PERIODS,
  PREFERRED_SELF_PERIOD,
  SELF_EVOLUTION_PERIODS,
  type EvolutionPeriod,
} from "@/features/social/constants/profile-evolution";

export interface ProfileEvolutionPeriod {
  periods: readonly EvolutionPeriod[];
  period: EvolutionPeriod;
  changePeriod: (period: EvolutionPeriod) => void;
}

/**
 * Período do gráfico de evolução do perfil. No seu, período fora do plano abre a tela do Pro
 * ("deixar tentar"); no de outra pessoa só existe o mês atual, em qualquer plano.
 */
export function useProfileEvolutionPeriod(isSelf: boolean): ProfileEvolutionPeriod {
  const gate = usePlanGate();
  const [chosen, setChosen] = useState<EvolutionPeriod | null>(null);
  const today = new Date();
  const periods = isSelf ? SELF_EVOLUTION_PERIODS : MEMBER_EVOLUTION_PERIODS;
  const chartFrom = (p: EvolutionPeriod) => evolutionPeriodStart(EVOLUTION_CHART_PERIOD[p], today, null);
  const isAvailable = (p: EvolutionPeriod) => periods.includes(p) && (!isSelf || gate.isChartFromVisible(chartFrom(p), today));
  const fallback = isAvailable(PREFERRED_SELF_PERIOD) ? PREFERRED_SELF_PERIOD : periods[0];

  const changePeriod = (p: EvolutionPeriod) => {
    if (!isSelf || gate.allowChartFrom(chartFrom(p), today)) setChosen(p);
  };

  // Plano que mudou ou troca de perfil: um período que deixou de valer volta ao que cabe.
  return { periods, period: chosen && isAvailable(chosen) ? chosen : fallback, changePeriod };
}
