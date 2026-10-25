"use client";

import { useCallback, useMemo } from "react";
import type { ApiError } from "@guf/api";
import { canUseFeature, fitsMonthLimit, hasRoomFor, isDateInChartWindow, type PlanFeature } from "@guf/core";
import { usePlanGateContext } from "@/features/plans/providers/plan-gate-provider";

/**
 * Portão de plano para as telas. A pessoa sempre consegue tentar (botões e formulários aparecem
 * normalmente); na hora de usar algo além do plano, `allow…` abre a tela do Pro e devolve false.
 * O histórico de treinos é completo em qualquer plano; dele, o plano só limita o que os gráficos mostram.
 * Gravações também são barradas no banco: `handlePlanError` cobre o caso de o app estar desatualizado.
 */
export function usePlanGate() {
  const { entitlements, showUpsell } = usePlanGateContext();

  /** Funcionalidade liberada? Senão, mostra a tela do Pro. */
  const allowFeature = useCallback(
    (feature: PlanFeature): boolean => {
      if (canUseFeature(entitlements, feature)) return true;
      showUpsell(feature);
      return false;
    },
    [entitlements, showUpsell],
  );

  /** Cabe mais um (`used` = quantos já existem)? Senão, mostra a tela do Pro. */
  const allowAnother = useCallback(
    (feature: PlanFeature, used: number): boolean => {
      if (hasRoomFor(entitlements, feature, used)) return true;
      showUpsell(feature);
      return false;
    },
    [entitlements, showUpsell],
  );

  /** Um gráfico que começa no dia ("yyyy-MM-dd") cabe no plano? Senão, mostra a tela do Pro. */
  const allowChartFrom = useCallback(
    (isoDate: string, today: Date): boolean => {
      if (isDateInChartWindow(entitlements, isoDate, today)) return true;
      showUpsell("chart_months");
      return false;
    },
    [entitlements, showUpsell],
  );

  /** Um período de N meses (null = "tudo") cabe no limite da funcionalidade? Senão, mostra a tela do Pro. */
  const allowMonths = useCallback(
    (feature: PlanFeature, months: number | null): boolean => {
      if (fitsMonthLimit(entitlements, feature, months)) return true;
      showUpsell(feature);
      return false;
    },
    [entitlements, showUpsell],
  );

  /** Erro `plan_limit` da API → tela do Pro. Devolve true quando tratou o erro. */
  const handlePlanError = useCallback(
    (error: ApiError | null | undefined, fallback: PlanFeature): boolean => {
      if (error?.code !== "plan_limit") return false;
      showUpsell(error.feature ?? fallback);
      return true;
    },
    [showUpsell],
  );

  return useMemo(
    () => ({
      entitlements,
      isFeatureEnabled: (feature: PlanFeature) => canUseFeature(entitlements, feature),
      /** Só consulta (sem abrir a tela do Pro): para escolher o período padrão e corrigir links antigos. */
      isChartFromVisible: (isoDate: string, today: Date) => isDateInChartWindow(entitlements, isoDate, today),
      /** Só consulta: o período de N meses cabe no plano (sem abrir a tela do Pro). */
      isWithinMonths: (feature: PlanFeature, months: number | null) => fitsMonthLimit(entitlements, feature, months),
      allowFeature,
      allowAnother,
      allowChartFrom,
      allowMonths,
      handlePlanError,
      showUpsell,
    }),
    [entitlements, allowFeature, allowAnother, allowChartFrom, allowMonths, handlePlanError, showUpsell],
  );
}
