"use client";

import { useCallback, useMemo } from "react";
import type { ApiError } from "@guf/api";
import {
  canUseFeature,
  hasRoomFor,
  historyWindowStart,
  isDateInHistoryWindow,
  isMonthInHistoryWindow,
  type PlanFeature,
} from "@guf/core";
import { usePlanGateContext } from "@/features/plans/providers/plan-gate-provider";

/**
 * Portão de plano para as telas. A pessoa sempre consegue tentar (botões e formulários aparecem
 * normalmente); na hora de usar algo além do plano, `allow…` abre a tela do Pro e devolve false.
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

  /** O dia ("yyyy-MM-dd") está no histórico liberado? Senão, mostra a tela do Pro. */
  const allowHistoryDate = useCallback(
    (isoDate: string, today: Date): boolean => {
      if (isDateInHistoryWindow(entitlements, isoDate, today)) return true;
      showUpsell("history_months");
      return false;
    },
    [entitlements, showUpsell],
  );

  /** O mês (1º dia) está no histórico liberado? Senão, mostra a tela do Pro. */
  const allowHistoryMonth = useCallback(
    (month: Date, today: Date): boolean => {
      if (isMonthInHistoryWindow(entitlements, month, today)) return true;
      showUpsell("history_months");
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
      /** Primeiro dia visível do histórico (null = sem limite), para escolher padrões que cabem no plano. */
      historyStart: (today: Date) => historyWindowStart(entitlements, today),
      isFeatureEnabled: (feature: PlanFeature) => canUseFeature(entitlements, feature),
      /** Só consulta (sem abrir a tela do Pro): para padrões e para corrigir links antigos. */
      isHistoryDateVisible: (isoDate: string, today: Date) => isDateInHistoryWindow(entitlements, isoDate, today),
      isHistoryMonthVisible: (month: Date, today: Date) => isMonthInHistoryWindow(entitlements, month, today),
      allowFeature,
      allowAnother,
      allowHistoryDate,
      allowHistoryMonth,
      handlePlanError,
      showUpsell,
    }),
    [entitlements, allowFeature, allowAnother, allowHistoryDate, allowHistoryMonth, handlePlanError, showUpsell],
  );
}
