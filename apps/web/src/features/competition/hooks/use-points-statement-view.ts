"use client";

import { useMemo, useState } from "react";
import {
  buildStatementWeeks,
  fromLocalISODate,
  seasonOf,
  seasonOfWeek,
  seasonRange,
  shiftSeason,
  statementTotals,
  statementYearMonths,
  toLocalISODate,
  yearRange,
  type PointSource,
} from "@guf/core";
import { usePlanGate } from "@/features/plans";
import { useCompetitionParameters, usePointsStatement } from "@/features/competition/api/use-competition";

export type StatementView = "month" | "year";

/**
 * Estado do extrato de pontos: mês (temporada) ou ano, filtro por origem e linhas abertas. Meses
 * anteriores e a visão do ano seguem o plano (como o ranking): sem histórico completo, a tela do Pro.
 */
export function usePointsStatementView() {
  const gate = usePlanGate();
  const today = useMemo(() => new Date(), []);
  const currentSeason = useMemo(() => seasonOf(today), [today]);
  const [view, setViewState] = useState<StatementView>("month");
  const [season, setSeason] = useState(currentSeason);
  const [filter, setFilter] = useState<PointSource | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const range = view === "month" ? seasonRange(season, today) : yearRange(today);
  const statement = usePointsStatement(range);
  const params = useCompetitionParameters(toLocalISODate(season));
  const seasonKey = toLocalISODate(season);
  const isCurrent = seasonKey === toLocalISODate(currentSeason);

  const rule = params.data && { constancyPointsPerDay: params.data.constancyPointsPerDay, recordPoints: params.data.recordPoints, minMinutes: params.data.minMinutes };
  const monthWeeks = statement.data?.weeks.filter((w) => seasonOfWeek(w.weekStart) === seasonKey) ?? [];
  const weeks = rule && statement.data ? buildStatementWeeks(monthWeeks, statement.data.sessions, rule, today) : [];
  const months = view === "year" && statement.data ? statementYearMonths(statement.data, today) : [];

  const goToSeason = (next: Date) => {
    if (toLocalISODate(next) !== toLocalISODate(currentSeason) && !gate.allowFeature("competition_full_history")) return;
    setSeason(next);
    setViewState("month");
    setFilter(null);
    setExpanded({});
  };

  return {
    view,
    setView: (next: StatementView) => {
      if (next === "year" && !gate.allowFeature("competition_full_history")) return;
      setViewState(next);
    },
    season,
    isCurrent,
    canGoBack: season.getMonth() > 0,
    previous: () => goToSeason(shiftSeason(season, -1)),
    next: () => !isCurrent && goToSeason(shiftSeason(season, 1)),
    openSeason: (key: string) => goToSeason(fromLocalISODate(key)),
    today,
    rule,
    weeks,
    totals: statementTotals(weeks),
    months,
    filter,
    toggleFilter: (source: PointSource) => setFilter((current) => (current === source ? null : source)),
    clearFilter: () => setFilter(null),
    isOpen: (sessionId: string, isFirst: boolean) => expanded[sessionId] ?? isFirst,
    toggleOpen: (sessionId: string, isFirst: boolean) => setExpanded((s) => ({ ...s, [sessionId]: !(s[sessionId] ?? isFirst) })),
    isLoading: statement.isPending || params.isPending,
    error: statement.error,
    retry: () => void statement.refetch(),
  };
}

export type PointsStatementView = ReturnType<typeof usePointsStatementView>;
