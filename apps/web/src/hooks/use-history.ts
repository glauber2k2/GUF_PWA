"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { historyApi, type ApiResult, type HistoryApi } from "@guf/api";
import { HISTORY_WEEKS, monthRange, shiftMonth, toLocalISODate, toMonthKey, weeksRange } from "@guf/core";
import { withDeviceCache, type CachedResult } from "@/lib/offline/device-cache";
import { HISTORY_KEY } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { mockHistoryApi, setHistoryMockScenario } from "@/mocks/history";
import { useAuth } from "@/providers/auth-provider";
import { useDevHistoryState, type DevHistoryState } from "./use-dev-history-state";

/**
 * Dados reais por padrão (com cópia no aparelho para abrir sem internet). Em DESENVOLVIMENTO,
 * com ?estado=, usa o mock (mesmo contrato). No build de produção o ramo do mock é eliminado.
 */
function useHistorySource(): { api: HistoryApi; dev: DevHistoryState; cached: boolean } {
  const dev = useDevHistoryState();
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setHistoryMockScenario(dev.scenario);
    return { api: mockHistoryApi, dev, cached: false };
  }
  return { api: historyApi, dev, cached: true };
}

/** Executa a consulta (com cópia no aparelho quando são dados reais) e lança o erro para o TanStack Query. */
async function run<T>(cacheKey: string, cached: boolean, fetcher: () => Promise<ApiResult<T>>): Promise<CachedResult<T>> {
  if (cached) {
    const res = await withDeviceCache(cacheKey, fetcher);
    if (res.error) throw res.error;
    return res.data;
  }
  const res = await fetcher();
  if (res.error) throw res.error;
  return { value: res.data, source: "network" };
}

/** Sequência, meta, unidade e dias treinados das últimas 104 semanas (faixa e gráfico com comparação). */
export function useHistoryOverview() {
  const { user } = useAuth();
  const { api, dev, cached } = useHistorySource();
  const today = toLocalISODate(new Date());
  const range = weeksRange(new Date(), HISTORY_WEEKS);
  return useQuery({
    queryKey: [HISTORY_KEY, "overview", user?.id, today, dev.scenario],
    enabled: Boolean(user),
    queryFn: () => run(`overview:${range.from}`, cached, () => api.getHistoryOverview(getSupabaseClient(), range)),
  });
}

/** Dias treinados do mês exibido no calendário (pré-carrega o mês anterior). */
export function useMonthTrainingDays(month: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { api, dev, cached } = useHistorySource();

  const options = (target: Date) => {
    const key = toMonthKey(target);
    return {
      queryKey: [HISTORY_KEY, "month", user?.id, key, dev.scenario],
      queryFn: () => run(`month:${key}`, cached, () => api.getTrainingDays(getSupabaseClient(), monthRange(target))),
    };
  };

  const monthKey = toMonthKey(month);
  useEffect(() => {
    if (user) void queryClient.prefetchQuery(options(shiftMonth(month, -1)));
    // options depende só do mês e da origem dos dados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthKey, user, queryClient, dev.scenario]);

  return useQuery({ ...options(month), enabled: Boolean(user) });
}

/** Treinos de um dia (folha do calendário); só busca com um dia selecionado. */
export function useDaySessions(performedOn: string | null) {
  const { user } = useAuth();
  const { api, dev, cached } = useHistorySource();
  return useQuery({
    queryKey: [HISTORY_KEY, "day", user?.id, performedOn, dev.scenario],
    enabled: Boolean(user && performedOn),
    queryFn: () => run(`day:${performedOn}`, cached, () => api.getDaySessions(getSupabaseClient(), { performedOn: performedOn ?? "" })),
  });
}

