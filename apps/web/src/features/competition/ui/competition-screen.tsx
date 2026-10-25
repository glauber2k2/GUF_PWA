"use client";

import Link from "next/link";
import type { CompetitionMetric } from "@guf/core";
import { useRouter } from "next/navigation";
import { ReceiptText, UserPlus, Users } from "lucide-react";
import { AppHeader, EmptyState, Icon } from "@/shared/components/ds";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useScrolled } from "@/shared/hooks/use-scrolled";
import { METRICS } from "@/features/competition/constants/competition-labels";
import { POINTS_STATEMENT_PATH } from "@/features/competition/constants/point-sources";
import { useCompetitionFilters } from "@/features/competition/hooks/use-competition-filters";
import { useMetricFormat } from "@/features/competition/hooks/use-metric-format";
import { useStandingsView, type StandingsView } from "@/features/competition/hooks/use-standings-view";
import { RankingPagination } from "@/features/competition/components/ranking-pagination";
import { CompetitionBoard, PeriodCaption } from "@/features/competition/components/competition-board";
import { PositionCard } from "@/features/competition/components/position-card";
import { DuelCard, Podium, RankingList } from "@/features/competition/components/competition-ranking";
import { RaceChart } from "@/features/competition/components/race-chart";
import { TOUR_TARGETS } from "@/features/onboarding";

const SEARCH_PEOPLE_PATH = "/buscar-pessoas";

/** Pódio, corrida, ranking paginado e duelo com o adversário escolhido (padrão: quem está logo à frente ou atrás). */
function FullRanking({ view, metric }: { view: StandingsView; metric: CompetitionMetric }) {
  const { unitLabel, format, formatVolume } = useMetricFormat(metric);
  const { context, rival } = view;
  if (!context) return null;
  const rivalId = rival?.userId ?? null;

  return (
    <>
      <PositionCard context={context} metric={metric} unit={unitLabel} format={format} />
      <Podium ranking={view.top} label={METRICS[metric].label} format={format} />
      <RaceChart lines={view.race.lines} dates={view.race.dates} rivalId={rivalId} caption={METRICS[metric].accumulated} format={format} onSelect={view.chooseRival} />
      <RankingList ranking={view.page.items} total={view.page.total} rivalId={rivalId} unit={unitLabel} format={format} onSelect={view.chooseRival} />
      <RankingPagination page={view.page.number} total={view.page.total} myPosition={context.me.position} isFetching={view.page.isFetching} onPage={view.goToPage} />
      {rival && (
        <DuelCard
          me={context.me}
          rival={rival}
          formatVolume={formatVolume}
          picker={{ candidates: view.page.items.filter((c) => !c.isMe), onPick: view.chooseRival }}
        />
      )}
    </>
  );
}

/**
 * Competição (protótipo "Competição"): você e quem vocês se seguem mutuamente. Pontos pela regra do
 * servidor (constância, sequência, recordes e volume); volume, treinos e recordes também como métrica.
 */
export function CompetitionScreen() {
  const scrolled = useScrolled();
  const router = useRouter();
  const filters = useCompetitionFilters();
  const view = useStandingsView(filters);

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 h-0 overflow-visible pt-[env(safe-area-inset-top)]">
        {scrolled && (
          <AppHeader
            title="Competição"
            collapsed
            trailing={
              <span className="flex">
                <Link href={withDevState(POINTS_STATEMENT_PATH)} aria-label="Ver extrato de pontos" className="grid size-11 place-items-center rounded-md text-fg">
                  <Icon icon={ReceiptText} size={20} />
                </Link>
                <Link href={SEARCH_PEOPLE_PATH} aria-label="Convidar amigos" className="grid size-11 place-items-center rounded-md text-fg">
                  <Icon icon={UserPlus} size={20} />
                </Link>
              </span>
            }
          />
        )}
      </div>
      <header className="flex items-center justify-between gap-3 pt-5 pb-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.02em]">Competição</h1>
          <PeriodCaption filters={filters} />
        </div>
        <span className="flex flex-none gap-2">
        <Link
          href={withDevState(POINTS_STATEMENT_PATH)}
          aria-label="Ver extrato de pontos"
          className="grid size-11 flex-none place-items-center rounded-md border border-border-strong bg-surface-3 text-fg hover:bg-surface-elevated"
        >
          <Icon icon={ReceiptText} size={20} />
        </Link>
        <Link
          href={SEARCH_PEOPLE_PATH}
          aria-label="Convidar amigos"
          data-tour={TOUR_TARGETS.inviteFriends}
          className="grid size-11 flex-none place-items-center rounded-md border border-border-strong bg-surface-3 text-fg hover:bg-surface-elevated"
        >
          <Icon icon={UserPlus} size={20} />
        </Link>
        </span>
      </header>

      <CompetitionBoard
        filters={filters}
        status={view.status}
        isAlone={view.isAlone}
        empty={
          <EmptyState
            icon={Users}
            title="Chame alguém para competir"
            message="A competição começa quando você e outra pessoa se seguem mutuamente. Encontre amigos ou mande o link do seu perfil."
            actionLabel="Encontrar pessoas"
            onAction={() => router.push(SEARCH_PEOPLE_PATH)}
          />
        }
      >
        <FullRanking view={view} metric={filters.metric} />
      </CompetitionBoard>
    </main>
  );
}
