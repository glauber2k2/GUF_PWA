"use client";

import { useMemo, useState } from "react";
import { competitionRange, type CompetitionMetric, type CompetitionPeriod, type CompetitionRange } from "@guf/core";
import { usePlanGate } from "@/features/plans";

export type CompetitionFiltersState = ReturnType<typeof useCompetitionFilters>;

/** Período e métrica da competição (tela geral e duelo). Fora do mês atual, o plano decide. */
export function useCompetitionFilters() {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<CompetitionPeriod>("month");
  const [metric, setMetric] = useState<CompetitionMetric>("points");
  const [custom, setCustom] = useState<CompetitionRange>(() => competitionRange("3m", today));
  const gate = usePlanGate();
  const range = period === "custom" ? custom : competitionRange(period, today);

  const changePeriod = (next: CompetitionPeriod, nextCustom?: CompetitionRange) => {
    // Fora do mês atual é do plano: a pessoa escolhe normalmente e a tela do Pro aparece.
    if (next !== "month" && !gate.allowFeature("competition_full_history")) return;
    if (nextCustom) setCustom(nextCustom);
    setPeriod(next);
  };

  return { today, period, metric, custom, range, query: { ...range, metric }, setMetric, changePeriod };
}
