"use client";

import { useMemo, useState } from "react";
import {
  chartBuckets,
  competitionRange,
  cumulativeSeries,
  formatNumber,
  headToHeadParticipants,
  rankCompetitors,
  toDisplayWeight,
  type CompetitionMetric,
  type CompetitionPeriod,
  type CompetitionRange,
  type RankedCompetitor,
} from "@guf/core";
import { useProfile } from "@/features/profile";
import { usePlanGate } from "@/features/plans";
import { useCompetitionBoard } from "@/features/competition/api/use-competition";
import { METRICS } from "@/features/competition/constants/competition-labels";
import type { RaceLine } from "@/features/competition/components/race-chart";

/** Ranking pronto para desenhar (você está nele). */
export interface ReadyBoard {
  ranking: RankedCompetitor[];
  me: RankedCompetitor;
  lines: RaceLine[];
  dates: string[];
  metric: CompetitionMetric;
  unitLabel: string;
  format: (value: number) => string;
  formatVolume: (value: number) => string;
}

export type CompetitionView = ReturnType<typeof useCompetitionView>;

/**
 * Período, métrica e ranking da competição, para a tela geral e para o duelo.
 * @param rivalId com ele, o ranking fica só entre você e essa pessoa
 */
export function useCompetitionView(rivalId: string | null = null) {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<CompetitionPeriod>("month");
  const [metric, setMetric] = useState<CompetitionMetric>("points");
  const [custom, setCustom] = useState<CompetitionRange>(() => competitionRange("3m", today));
  const range = period === "custom" ? custom : competitionRange(period, today);
  const board = useCompetitionBoard(range);
  const unit = useProfile().data?.weightUnit ?? "kg";
  const gate = usePlanGate();

  const ranking = useMemo(
    () => (board.data ? rankCompetitors(headToHeadParticipants(board.data.participants, rivalId), board.data.weeks, board.data.days, metric, range) : []),
    [board.data, rivalId, metric, range],
  );
  const toDisplay = (value: number) => (metric === "volume" ? (toDisplayWeight(value, unit) ?? 0) : value);
  const me = ranking.find((c) => c.isMe);
  const dates = chartBuckets(range).dates;

  const ready: ReadyBoard | null =
    board.data && me
      ? {
          ranking,
          me,
          dates,
          metric,
          lines: ranking.map((competitor) => ({
            competitor,
            values: cumulativeSeries(competitor.userId, board.data.weeks, board.data.days, metric, dates),
          })),
          unitLabel: metric === "volume" ? unit : METRICS[metric].unit,
          format: (value) => formatNumber(toDisplay(value), 0),
          formatVolume: (value) => formatNumber(toDisplayWeight(value, unit) ?? 0, 0),
        }
      : null;

  const changePeriod = (next: CompetitionPeriod, nextCustom?: CompetitionRange) => {
    // Fora do mês atual é do plano: a pessoa escolhe normalmente e a tela do Pro aparece.
    if (next !== "month" && !gate.allowFeature("competition_full_history")) return;
    if (nextCustom) setCustom(nextCustom);
    setPeriod(next);
  };

  return { today, period, metric, custom, range, board, ready, setMetric, changePeriod };
}
