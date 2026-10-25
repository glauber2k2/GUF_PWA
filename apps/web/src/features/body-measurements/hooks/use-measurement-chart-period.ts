"use client";

import { useState } from "react";
import { measurementPeriodMonths, type MeasurementPeriod } from "@guf/core";
import { usePlanGate } from "@/features/plans";

/** Período com que o gráfico abre: cabe em qualquer plano (o Free mostra os últimos 3 meses). */
const DEFAULT_PERIOD: MeasurementPeriod = "3M";
const PLAN_FEATURE = "measurement_chart_months";

export interface MeasurementChartPeriod {
  period: MeasurementPeriod;
  changePeriod: (period: MeasurementPeriod) => void;
}

/**
 * Período do gráfico de uma medida. Todos os períodos aparecem ("deixar tentar"); escolher um maior
 * que o plano abre a tela do Pro e o gráfico continua no que estava. Os registros não mudam: o plano
 * limita só o que o gráfico desenha.
 */
export function useMeasurementChartPeriod(): MeasurementChartPeriod {
  const gate = usePlanGate();
  const [chosen, setChosen] = useState<MeasurementPeriod>(DEFAULT_PERIOD);

  const changePeriod = (period: MeasurementPeriod) => {
    if (gate.allowMonths(PLAN_FEATURE, measurementPeriodMonths(period))) setChosen(period);
  };

  // Plano que mudou (ex.: o Pro acabou): um período que deixou de caber volta ao padrão.
  const fits = gate.isWithinMonths(PLAN_FEATURE, measurementPeriodMonths(chosen));
  return { period: fits ? chosen : DEFAULT_PERIOD, changePeriod };
}
