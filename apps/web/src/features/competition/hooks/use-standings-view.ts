"use client";

import { useState } from "react";
import { chartParticipantIds, defaultRival, standingContext, type CompetitionStanding } from "@guf/core";
import { useCompetitionStandings, useStandingsNearMe, useStandingsOf } from "@/features/competition/api/use-competition";
import type { CompetitionFiltersState } from "@/features/competition/hooks/use-competition-filters";
import { useRaceLines } from "@/features/competition/hooks/use-race-lines";

export type StandingsView = ReturnType<typeof useStandingsView>;

function uniqueById(standings: readonly CompetitionStanding[]): CompetitionStanding[] {
  return [...new Map(standings.map((s) => [s.userId, s])).values()];
}

/**
 * Classificação da tela geral, paginada no banco: o topo (pódio), a página aberta, você com os
 * vizinhos (cartão "Sua posição"), o adversário do duelo e só as linhas do gráfico que aparecem.
 * Trocar período ou métrica volta para a primeira página.
 */
export function useStandingsView(filters: CompetitionFiltersState) {
  const { query, range, metric } = filters;
  const filterKey = `${query.from}|${query.to}|${metric}`;
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const [rivalChoice, setRivalChoice] = useState<string | null>(null);

  const top = useCompetitionStandings(query, 1);
  const current = useCompetitionStandings(query, page);
  const near = useStandingsNearMe(query);
  const context = near.data ? standingContext(near.data.items, near.data.total) : null;

  const known = uniqueById([...(current.data?.items ?? []), ...(top.data?.items ?? []), ...(near.data?.items ?? [])]);
  const chosenKnown = known.find((s) => s.userId === rivalChoice && !s.isMe);
  // Adversário escolhido fora das linhas já carregadas (ex.: veio de outra página): busca só ele.
  const rivalLookup = useStandingsOf(query, rivalChoice && !chosenKnown ? [rivalChoice] : []);
  const chosen = chosenKnown ?? rivalLookup.data?.find((s) => !s.isMe) ?? null;
  const rival = chosen ?? defaultRival(context);

  const chartIds = context ? chartParticipantIds(context.me.userId, rival?.userId ?? null, top.data?.items ?? []) : [];
  const pool = uniqueById([...known, ...(rival ? [rival] : [])]);
  const chartPeople = chartIds.map((id) => pool.find((s) => s.userId === id)).filter((s): s is CompetitionStanding => Boolean(s));
  const race = useRaceLines(range, metric, chartPeople);

  const queries = [top, current, near];
  return {
    status: {
      isPending: queries.some((q) => q.isPending),
      isError: queries.some((q) => q.isError),
      error: queries.find((q) => q.error)?.error ?? null,
      refetch: () => queries.forEach((q) => void q.refetch()),
    },
    isAlone: (near.data?.total ?? 0) <= 1,
    top: top.data?.items ?? [],
    page: { number: page, items: current.data?.items ?? [], total: current.data?.total ?? 0, isFetching: current.isFetching },
    goToPage: (next: number) => setPageState({ key: filterKey, page: next }),
    context,
    rival,
    chooseRival: setRivalChoice,
    race,
  };
}
