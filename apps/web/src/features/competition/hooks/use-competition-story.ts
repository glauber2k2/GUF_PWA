"use client";

import { useMemo } from "react";
import { buildCompetitionStory, competitionRange, seasonOf, seasonRange, standingContext } from "@guf/core";
import { useCompetitionStandings, usePointsStatement, useStandingsNearMe } from "@/features/competition/api/use-competition";

/**
 * Sua competição da temporada para as imagens de compartilhar: sempre "Este mês" por pontos (o que
 * a imagem diz), independente dos filtros da tela. Só busca com a folha aberta (`isOpen`); as
 * consultas da classificação são as mesmas da tela no filtro padrão (vêm do cache).
 */
export function useCompetitionStory(isOpen: boolean) {
  const today = useMemo(() => new Date(), []);
  const season = seasonOf(today);
  const query = { ...competitionRange("month", today), metric: "points" as const };
  const near = useStandingsNearMe(query, isOpen);
  const top = useCompetitionStandings(query, 1, isOpen);
  const statement = usePointsStatement(seasonRange(season, today), isOpen);

  const story = useMemo(() => {
    if (!near.data || !top.data || !statement.data) return undefined;
    const context = standingContext(near.data.items, near.data.total);
    if (!context) return undefined;
    return buildCompetitionStory({
      me: context.me,
      leader: top.data.items[0] ?? null,
      runnerUp: context.runnerUp,
      total: near.data.total,
      weeks: statement.data.weeks,
      season,
      // Hora em que os dados chegaram: a contagem regressiva sai congelada nela.
      now: new Date(),
    });
  }, [near.data, top.data, statement.data, season]);

  const queries = [near, top, statement];
  return {
    story,
    error: queries.find((q) => q.error)?.error ?? null,
    retry: () => queries.forEach((q) => void q.refetch()),
  };
}
