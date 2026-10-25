"use client";

import { useSearchParams } from "next/navigation";
import type { CompetitionMetric } from "@guf/core";
import { ChevronLeft, Swords } from "lucide-react";
import { EmptyState, IconButton } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { METRICS } from "@/features/competition/constants/competition-labels";
import { useCompetitionFilters } from "@/features/competition/hooks/use-competition-filters";
import { useDuelView, type DuelView } from "@/features/competition/hooks/use-duel-view";
import { useMetricFormat } from "@/features/competition/hooks/use-metric-format";
import { CompetitionBoard, PeriodCaption } from "@/features/competition/components/competition-board";
import { PositionCard, firstName } from "@/features/competition/components/position-card";
import { DuelCard } from "@/features/competition/components/competition-ranking";
import { RaceChart } from "@/features/competition/components/race-chart";

/** Você contra a pessoa: posição, corrida das duas linhas e comparação em cada métrica. */
function HeadToHead({ view, metric }: { view: DuelView; metric: CompetitionMetric }) {
  const { unitLabel, format, formatVolume } = useMetricFormat(metric);
  const { context, rival } = view;
  if (!context || !rival) return null;
  return (
    <>
      <PositionCard context={context} metric={metric} unit={unitLabel} format={format} />
      <RaceChart lines={view.lines} dates={view.dates} rivalId={rival.userId} caption={METRICS[metric].accumulated} format={format} />
      <DuelCard me={context.me} rival={rival} formatVolume={formatVolume} />
    </>
  );
}

/**
 * Duelo (/competicao/duelo?id=…), aberto pelo botão de espadas no perfil de outra pessoa: a mesma
 * competição, com o ranking só entre você e ela.
 */
export function DuelScreen() {
  const rivalId = useSearchParams().get("id");
  const goBack = useGoBack("/competicao");
  const filters = useCompetitionFilters();
  const view = useDuelView(filters, rivalId);
  const title = view.rival ? `Você × ${firstName(view.rival)}` : "Duelo";

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 box-content flex h-14 items-center gap-1 bg-background/90 pr-4 pl-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={goBack} />
        <h1 className="m-0 min-w-0 flex-1 truncate text-xl leading-[26px] font-bold tracking-[-0.01em]">{title}</h1>
      </div>
      <div className="pt-1 pb-4">
        <PeriodCaption filters={filters} />
      </div>

      <CompetitionBoard
        filters={filters}
        status={view.status}
        isAlone={view.isAlone}
        empty={
          <EmptyState
            icon={Swords}
            title="Vocês ainda não competem"
            message="A competição começa quando vocês se seguem mutuamente."
            actionLabel="Voltar ao perfil"
            onAction={goBack}
          />
        }
      >
        <HeadToHead view={view} metric={filters.metric} />
      </CompetitionBoard>
    </main>
  );
}
