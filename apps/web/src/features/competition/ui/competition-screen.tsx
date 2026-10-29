"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StandingsQuery } from "@guf/api";
import type { SeasonPodium } from "@guf/core";
import { ReceiptText, Share2, UserPlus, Users } from "lucide-react";
import { AppHeader, EmptyState, Icon } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { ShareCompetitionSheet, STORY_SAVED_TOAST } from "@/features/share";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useScrolled } from "@/shared/hooks/use-scrolled";
import { METRICS } from "@/features/competition/constants/competition-labels";
import { POINTS_STATEMENT_PATH } from "@/features/competition/constants/point-sources";
import { useSeasonPodium } from "@/features/competition/api/use-competition";
import { useCompetitionFilters } from "@/features/competition/hooks/use-competition-filters";
import { useCompetitionStory } from "@/features/competition/hooks/use-competition-story";
import { useMetricFormat } from "@/features/competition/hooks/use-metric-format";
import { useStandingsView, type StandingsView } from "@/features/competition/hooks/use-standings-view";
import { RivalPickerSheet } from "@/features/competition/components/rival-picker-sheet";
import { StandingsPagination } from "@/features/competition/components/standings-pagination";
import { CompetitionBoard, PeriodCaption } from "@/features/competition/components/competition-board";
import { PositionCard } from "@/features/competition/components/position-card";
import { DuelCard, Podium, RankingList } from "@/features/competition/components/competition-ranking";
import { RaceChart } from "@/features/competition/components/race-chart";
import { SeasonPodiumCard } from "@/features/competition/components/season-podium";
import { TOUR_TARGETS } from "@/features/onboarding";

const SEARCH_PEOPLE_PATH = "/buscar-pessoas";

/**
 * Sua posição, pódio, corrida, duelo (adversário padrão: quem está logo à frente ou atrás) e, por
 * último, o ranking paginado (a lista mais longa fica no fim da tela). Com `seasonPodium` (3 primeiros
 * dias da temporada), o pódio mostra o campeão da temporada encerrada no lugar do atual.
 */
function FullRanking({ view, query, seasonPodium }: { view: StandingsView; query: StandingsQuery; seasonPodium: SeasonPodium | null }) {
  const { metric } = query;
  const { unitLabel, format, formatVolume } = useMetricFormat(metric);
  const [isPickingRival, setPickingRival] = useState(false);
  const { context, rival } = view;
  if (!context) return null;
  const rivalId = rival?.userId ?? null;

  return (
    <>
      <PositionCard context={context} metric={metric} unit={unitLabel} format={format} />
      {seasonPodium ? <SeasonPodiumCard podium={seasonPodium} /> : <Podium ranking={view.top} label={METRICS[metric].label} format={format} />}
      <RaceChart lines={view.race.lines} dates={view.race.dates} rivalId={rivalId} caption={METRICS[metric].accumulated} format={format} onSelect={view.chooseRival} />
      {rival && <DuelCard me={context.me} rival={rival} formatVolume={formatVolume} onChangeRival={() => setPickingRival(true)} />}
      <RankingList ranking={view.page.items} total={view.page.total} rivalId={rivalId} unit={unitLabel} format={format} onSelect={view.chooseRival} />
      <StandingsPagination page={view.page.number} total={view.page.total} myPosition={context.me.position} isFetching={view.page.isFetching} onPage={view.goToPage} />
      <RivalPickerSheet open={isPickingRival} query={query} rivalId={rivalId} onPick={view.chooseRival} onClose={() => setPickingRival(false)} />
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
  // O campeão é o da temporada: só aparece em "Este mês".
  const seasonPodium = useSeasonPodium(filters.period === "month");
  const { showToast } = useAppShell();
  const [isSharing, setSharing] = useState(false);
  const share = useCompetitionStory(isSharing);

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 h-0 overflow-visible pt-[env(safe-area-inset-top)]">
        {scrolled && (
          <AppHeader
            title="Competição"
            collapsed
            trailing={
              <span className="flex">
                <button type="button" aria-label="Compartilhar a competição" onClick={() => setSharing(true)} className="grid size-11 cursor-pointer place-items-center rounded-md bg-transparent text-fg">
                  <Icon icon={Share2} size={20} />
                </button>
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
        <button
          type="button"
          aria-label="Compartilhar a competição"
          onClick={() => setSharing(true)}
          className="grid size-11 flex-none cursor-pointer place-items-center rounded-md border border-border-strong bg-surface-3 text-fg hover:bg-surface-elevated"
        >
          <Icon icon={Share2} size={20} />
        </button>
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
        <FullRanking view={view} query={filters.query} seasonPodium={filters.period === "month" ? (seasonPodium.data ?? null) : null} />
      </CompetitionBoard>

      <ShareCompetitionSheet
        open={isSharing}
        onClose={() => setSharing(false)}
        story={share.story}
        error={share.error}
        onRetry={share.retry}
        onSaved={() => showToast(...STORY_SAVED_TOAST)}
      />
    </main>
  );
}
