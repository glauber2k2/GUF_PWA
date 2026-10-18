"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isChartPeriod, parseMonthKey, startOfMonthOf, toMonthKey, type ChartPeriod } from "@guf/core";

const DEFAULT_PERIOD: ChartPeriod = "3m";

/**
 * Mês do calendário (?mes=2026-10) e período do gráfico (?periodo=3m) na query string:
 * voltar/compartilhar mantém a visão. Mês futuro ou inválido → mês atual.
 */
export function useHistoryParams(today: Date) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentMonth = startOfMonthOf(today);
  const parsed = parseMonthKey(searchParams.get("mes"));
  const month = parsed && parsed <= currentMonth ? parsed : currentMonth;
  const rawPeriod = searchParams.get("periodo");
  const period = isChartPeriod(rawPeriod) ? rawPeriod : DEFAULT_PERIOD;

  const update = useCallback(
    (key: "mes" | "periodo", value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return {
    month,
    period,
    setMonth: (date: Date) => update("mes", toMonthKey(date)),
    setPeriod: (value: ChartPeriod) => update("periodo", value),
  };
}
