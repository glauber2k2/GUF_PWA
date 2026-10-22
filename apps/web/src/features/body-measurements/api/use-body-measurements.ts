"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { removePartValues, withoutPartValues, type MeasurementPart } from "@guf/core";
import { bodyMeasurementsApi, type ApiError, type BodyMeasurementSave, type BodyMeasurementsApi, type BodyMeasurementsOverview } from "@guf/api";
import { useAuth } from "@/features/auth";
import { mockBodyMeasurementsApi, setMeasurementsMockScenario } from "@/mocks/body-measurements";
import { BODY_MEASUREMENTS_KEY, invalidateHealthConsentData } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { useDevMeasurementsState, type DevMeasurementsState } from "@/features/body-measurements/hooks/use-dev-measurements-state";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (mesmo contrato). */
export function useMeasurementsSource(): { api: BodyMeasurementsApi; dev: DevMeasurementsState } {
  const dev = useDevMeasurementsState();
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setMeasurementsMockScenario(dev.scenario);
    return { api: mockBodyMeasurementsApi, dev };
  }
  return { api: bodyMeasurementsApi, dev };
}

/** Medidas só com internet: dado de saúde não fica guardado no aparelho (Termo de Saúde). */
export function useCanUseMeasurements(): boolean {
  const online = useOnlineStatus();
  const { dev } = useMeasurementsSource();
  return online && !dev.forceOffline;
}

/**
 * Consentimento + medidas da pessoa logada. Sem `withDeviceCache` de propósito: o dado sensível vive
 * só na memória do TanStack Query (limpa ao sair da conta).
 */
export function useBodyMeasurements(enabled = true) {
  const { api, dev } = useMeasurementsSource();
  const { user } = useAuth();
  return useQuery<BodyMeasurementsOverview, ApiError>({
    queryKey: [BODY_MEASUREMENTS_KEY, user?.id ?? null, dev.scenario],
    enabled: enabled && (Boolean(user) || Boolean(dev.scenario)),
    queryFn: async () => {
      const { data, error } = await api.getBodyMeasurements(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/** Autoriza o uso dos dados de saúde (Termo de Saúde vigente). */
export function useGrantHealthConsent() {
  const { api } = useMeasurementsSource();
  const queryClient = useQueryClient();
  return useMutation<null, ApiError>({
    mutationFn: async () => {
      const { error } = await api.grantHealthConsent(getSupabaseClient());
      if (error) throw error;
      return null;
    },
    onSuccess: () => invalidateHealthConsentData(queryClient),
  });
}

/**
 * Desfazer uma medição salva. Função solta (não useMutation): roda pelo toast depois que a tela de
 * registro já fechou, então não pode depender do componente montado.
 */
export function useUndoBodyMeasurement(): (input: BodyMeasurementSave) => Promise<ApiError | null> {
  const { api } = useMeasurementsSource();
  const queryClient = useQueryClient();
  return useCallback(
    async (input) => {
      const { error } = await api.saveBodyMeasurement(getSupabaseClient(), input);
      await queryClient.invalidateQueries({ queryKey: [BODY_MEASUREMENTS_KEY] });
      return error;
    },
    [api, queryClient],
  );
}

/**
 * Apaga o registro de um músculo num dia (arrastar a linha para o lado). Some da tela na hora
 * (otimista); se falhar, a lista volta pelo recarregamento.
 */
export function useRemoveMeasurementRecord() {
  const { api } = useMeasurementsSource();
  const queryClient = useQueryClient();
  return useMutation<null, ApiError, { measuredOn: string; part: MeasurementPart }>({
    mutationFn: async ({ measuredOn, part }) => {
      const { error } = await api.saveBodyMeasurement(getSupabaseClient(), { measuredOn, values: removePartValues(part) });
      if (error) throw error;
      return null;
    },
    onMutate: async ({ measuredOn, part }) => {
      await queryClient.cancelQueries({ queryKey: [BODY_MEASUREMENTS_KEY] });
      queryClient.setQueriesData<BodyMeasurementsOverview>({ queryKey: [BODY_MEASUREMENTS_KEY] }, (current) =>
        current ? { ...current, days: withoutPartValues(current.days, measuredOn, part) } : current,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BODY_MEASUREMENTS_KEY] }),
  });
}

/** Grava as medidas de um dia e recarrega a lista. */
export function useSaveBodyMeasurement() {
  const { api } = useMeasurementsSource();
  const queryClient = useQueryClient();
  return useMutation<null, ApiError, BodyMeasurementSave>({
    mutationFn: async (input) => {
      const { error } = await api.saveBodyMeasurement(getSupabaseClient(), input);
      if (error) throw error;
      return null;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [BODY_MEASUREMENTS_KEY] }),
  });
}
