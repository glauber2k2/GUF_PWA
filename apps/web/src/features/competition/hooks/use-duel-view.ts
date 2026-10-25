"use client";

import { rankCompetitors, standingContext, toStandings } from "@guf/core";
import { useStandingsNearMe, useStandingsOf } from "@/features/competition/api/use-competition";
import type { CompetitionFiltersState } from "@/features/competition/hooks/use-competition-filters";
import { useRaceLines } from "@/features/competition/hooks/use-race-lines";

export type DuelView = ReturnType<typeof useDuelView>;

/**
 * Duelo: só você e a pessoa. O banco devolve as duas (sem baixar os demais competidores) e as
 * séries das duas; a posição entre vocês é calculada aqui com a mesma regra (rankCompetitors).
 */
export function useDuelView(filters: CompetitionFiltersState, rivalId: string | null) {
  const { query, range, metric } = filters;
  const near = useStandingsNearMe(query);
  const rivalQuery = useStandingsOf(query, rivalId ? [rivalId] : []);
  const me = near.data?.items.find((s) => s.isMe) ?? null;
  const rival = rivalQuery.data?.find((s) => s.userId === rivalId && !s.isMe) ?? null;
  const people = me && rival ? [me, rival] : [];
  const race = useRaceLines(range, metric, people);
  const series = race.series.data;

  const ranking = series && people.length === 2 ? toStandings(rankCompetitors(people, series.weeks, series.days, metric, range)) : [];
  const byId = new Map(ranking.map((s) => [s.userId, s]));
  const lines = race.lines.map((line) => ({ ...line, competitor: byId.get(line.competitor.userId) ?? line.competitor }));
  // Consulta desligada (sem adversário) fica "pendente" para sempre no TanStack Query: só conta a que roda.
  const queries = rivalId ? [near, rivalQuery] : [near];

  return {
    status: {
      isPending: queries.some((q) => q.isPending) || (people.length === 2 && race.series.isPending),
      isError: queries.some((q) => q.isError) || race.series.isError,
      error: queries.find((q) => q.error)?.error ?? race.series.error ?? null,
      refetch: () => [...queries, race.series].forEach((q) => void q.refetch()),
    },
    /** A pessoa não está entre os seus competidores (vocês ainda não se seguem mutuamente). */
    isAlone: !rivalId || (Boolean(rivalQuery.data) && !rival),
    /** A pessoa com a posição entre vocês dois (antes das séries chegarem, a da classificação geral). */
    rival: (rival && byId.get(rival.userId)) ?? rival,
    context: ranking.length === 2 ? standingContext(ranking, 2) : null,
    lines,
    dates: race.dates,
  };
}
