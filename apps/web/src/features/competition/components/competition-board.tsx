"use client";

import type { ReactNode } from "react";
import { Timer } from "lucide-react";
import { seasonOf, toLocalISODate } from "@guf/core";
import { Banner, Icon, Skeleton } from "@/shared/components/ds";
import { CompetitionFilters, periodCaption } from "@/features/competition/components/competition-filters";
import { CompetitionRules } from "@/features/competition/components/competition-rules";
import type { CompetitionView, ReadyBoard } from "@/features/competition/hooks/use-competition-view";
import { TOUR_TARGETS } from "@/features/onboarding";

function CompetitionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[260px] w-full rounded-lg" />
      <Skeleton className="h-[220px] w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

/** "Termina em 12 dias" · "1 jul – 18 out" (abaixo do título das telas de competição). */
export function PeriodCaption({ view }: { view: CompetitionView }) {
  return (
    <p className="m-0 flex items-center gap-1.5 text-sm leading-5 text-fg-secondary">
      <Icon icon={Timer} size={16} className="text-accent-text" />
      <span>{periodCaption(view.period, view.range, view.today)}</span>
    </p>
  );
}

/**
 * Corpo comum das telas de competição: filtros, carregando/erro, o conteúdo de cada tela e as regras.
 * @param empty mostrado quando não há com quem comparar (só você no ranking)
 * @param children conteúdo da tela com o ranking pronto
 */
export function CompetitionBoard({ view, empty, children }: { view: CompetitionView; empty: ReactNode; children: (board: ReadyBoard) => ReactNode }) {
  const { board, ready } = view;
  return (
    <div className="flex flex-col gap-4">
      <div data-tour={TOUR_TARGETS.competitionFilters}>
        <CompetitionFilters
          period={view.period}
          metric={view.metric}
          custom={view.custom}
          today={view.today}
          onPeriod={view.changePeriod}
          onMetric={view.setMetric}
        />
      </div>

      {board.isPending ? (
        <CompetitionSkeleton />
      ) : board.isError || !ready ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void board.refetch()}>
          {board.error?.message ?? "Não foi possível carregar a competição. Verifique a internet e tente de novo."}
        </Banner>
      ) : ready.ranking.length === 1 ? (
        empty
      ) : (
        children(ready)
      )}

      <div data-tour={TOUR_TARGETS.competitionRules}>
        <CompetitionRules season={toLocalISODate(seasonOf(view.today))} />
      </div>
    </div>
  );
}
