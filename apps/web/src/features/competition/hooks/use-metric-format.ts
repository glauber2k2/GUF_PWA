"use client";

import { formatNumber, toDisplayWeight, type CompetitionMetric } from "@guf/core";
import { useProfile } from "@/features/profile";
import { METRICS } from "@/features/competition/constants/competition-labels";

export interface MetricFormat {
  unitLabel: string;
  format: (value: number) => string;
  formatVolume: (value: number) => string;
}

/** Unidade e formatação da métrica (volume na unidade de peso da pessoa). */
export function useMetricFormat(metric: CompetitionMetric): MetricFormat {
  const unit = useProfile().data?.weightUnit ?? "kg";
  const formatVolume = (value: number) => formatNumber(toDisplayWeight(value, unit) ?? 0, 0);
  return {
    unitLabel: metric === "volume" ? unit : METRICS[metric].unit,
    format: (value) => (metric === "volume" ? formatVolume(value) : formatNumber(value, 0)),
    formatVolume,
  };
}
