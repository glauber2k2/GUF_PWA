"use client";

import { useSearchParams } from "next/navigation";
import { ChevronLeft, Swords } from "lucide-react";
import { EmptyState, IconButton } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { METRICS } from "@/features/competition/constants/competition-labels";
import { useCompetitionView, type ReadyBoard } from "@/features/competition/hooks/use-competition-view";
import { CompetitionBoard, PeriodCaption } from "@/features/competition/components/competition-board";
import { PositionCard, firstName } from "@/features/competition/components/position-card";
import { DuelCard } from "@/features/competition/components/competition-ranking";
import { RaceChart } from "@/features/competition/components/race-chart";

/** Você contra a pessoa: posição, corrida das duas linhas e comparação em cada métrica. */
function HeadToHead({ board, rivalId }: { board: ReadyBoard; rivalId: string }) {
  const rival = board.ranking.find((c) => c.userId === rivalId);
  if (!rival) return null;
  return (
    <>
      <PositionCard ranking={board.ranking} metric={board.metric} unit={board.unitLabel} format={board.format} />
      <RaceChart lines={board.lines} dates={board.dates} rivalId={rivalId} caption={METRICS[board.metric].accumulated} format={board.format} />
      <DuelCard me={board.me} rival={rival} formatVolume={board.formatVolume} />
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
  const view = useCompetitionView(rivalId);
  const rival = view.board.data?.participants.find((p) => p.userId === rivalId && !p.isMe);
  const title = rival ? `Você × ${firstName(rival)}` : "Duelo";

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 box-content flex h-14 items-center gap-1 bg-background/90 pr-4 pl-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={goBack} />
        <h1 className="m-0 min-w-0 flex-1 truncate text-xl leading-[26px] font-bold tracking-[-0.01em]">{title}</h1>
      </div>
      <div className="pt-1 pb-4">
        <PeriodCaption view={view} />
      </div>

      <CompetitionBoard
        view={view}
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
        {(board) => rivalId && <HeadToHead board={board} rivalId={rivalId} />}
      </CompetitionBoard>
    </main>
  );
}
