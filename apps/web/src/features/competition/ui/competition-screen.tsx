"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Users } from "lucide-react";
import { AppHeader, EmptyState, Icon } from "@/shared/components/ds";
import { useScrolled } from "@/shared/hooks/use-scrolled";
import { METRICS } from "@/features/competition/constants/competition-labels";
import { useCompetitionView, type ReadyBoard } from "@/features/competition/hooks/use-competition-view";
import { CompetitionBoard, PeriodCaption } from "@/features/competition/components/competition-board";
import { PositionCard } from "@/features/competition/components/position-card";
import { DuelCard, Podium, RankingList } from "@/features/competition/components/competition-ranking";
import { RaceChart } from "@/features/competition/components/race-chart";

const SEARCH_PEOPLE_PATH = "/buscar-pessoas";

/** Pódio, corrida, ranking e duelo com o adversário escolhido (padrão: quem está logo à frente ou atrás). */
function FullRanking({ board }: { board: ReadyBoard }) {
  const [rivalChoice, setRivalChoice] = useState<string | null>(null);
  const { ranking, me, metric, format } = board;
  const meIndex = ranking.indexOf(me);
  const fallbackRival = ranking[meIndex - 1] ?? ranking[meIndex + 1] ?? null;
  const rival = ranking.find((c) => c.userId === rivalChoice && !c.isMe) ?? fallbackRival;
  const rivalId = rival?.userId ?? null;

  return (
    <>
      <PositionCard ranking={ranking} metric={metric} unit={board.unitLabel} format={format} />
      <Podium ranking={ranking} label={METRICS[metric].label} format={format} />
      <RaceChart lines={board.lines} dates={board.dates} rivalId={rivalId} caption={METRICS[metric].accumulated} format={format} />
      <RankingList ranking={ranking} rivalId={rivalId} unit={board.unitLabel} format={format} onSelect={setRivalChoice} />
      {rival && (
        <DuelCard
          me={me}
          rival={rival}
          formatVolume={board.formatVolume}
          picker={{ candidates: ranking.filter((c) => !c.isMe), onPick: setRivalChoice }}
        />
      )}
    </>
  );
}

/**
 * Competição (protótipo "Competição"): você e quem vocês se seguem mutuamente. Pontos pela regra do
 * servidor (constância, esforço e sequência); volume, treinos e recordes como comparação.
 */
export function CompetitionScreen() {
  const scrolled = useScrolled();
  const router = useRouter();
  const view = useCompetitionView();

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 h-0 overflow-visible pt-[env(safe-area-inset-top)]">
        {scrolled && (
          <AppHeader
            title="Competição"
            collapsed
            trailing={
              <Link href={SEARCH_PEOPLE_PATH} aria-label="Convidar amigos" className="grid size-11 place-items-center rounded-md text-fg">
                <Icon icon={UserPlus} size={20} />
              </Link>
            }
          />
        )}
      </div>
      <header className="flex items-center justify-between gap-3 pt-5 pb-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.02em]">Competição</h1>
          <PeriodCaption view={view} />
        </div>
        <Link
          href={SEARCH_PEOPLE_PATH}
          aria-label="Convidar amigos"
          className="grid size-11 flex-none place-items-center rounded-md border border-border-strong bg-surface-3 text-fg hover:bg-surface-elevated"
        >
          <Icon icon={UserPlus} size={20} />
        </Link>
      </header>

      <CompetitionBoard
        view={view}
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
        {(board) => <FullRanking board={board} />}
      </CompetitionBoard>
    </main>
  );
}
