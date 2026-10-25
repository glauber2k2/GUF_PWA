"use client";

import { chartBuckets, cumulativeSeries, type CompetitionMetric, type CompetitionRange, type RankedCompetitor } from "@guf/core";
import { useCompetitionSeries } from "@/features/competition/api/use-competition";
import type { RaceLine } from "@/features/competition/components/race-chart";

/** Linhas do gráfico da corrida só das pessoas pedidas (séries buscadas só delas). */
export function useRaceLines(range: CompetitionRange, metric: CompetitionMetric, competitors: readonly RankedCompetitor[]) {
  const series = useCompetitionSeries(
    range,
    competitors.map((c) => c.userId),
  );
  const dates = chartBuckets(range).dates;
  const lines: RaceLine[] = series.data
    ? competitors.map((competitor) => ({ competitor, values: cumulativeSeries(competitor.userId, series.data.weeks, series.data.days, metric, dates) }))
    : [];
  return { lines, dates, series };
}
