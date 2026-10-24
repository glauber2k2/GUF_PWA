"use client";

import { Pause, Play, Square } from "lucide-react";
import { cardioSetCountLabel, formatElapsed, type CardioTotals } from "@guf/core";
import { IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { CARDIO_PHASE_STYLES } from "@/features/workout/components/cardio/cardio-timer-status";
import type { CardioTimerControls } from "@/features/workout/hooks/use-cardio-timer-controls";

export interface CardioCollapsedSummaryProps {
  /** Sem cronômetro (edição de treino concluído), só o total. */
  timer?: CardioTimerControls;
  setCount: number;
  totals: CardioTotals;
}

/** Card recolhido: com o cronômetro contando, tempo + pausar/parar; parado, total feito e play para outra série. */
export function CardioCollapsedSummary({ timer, setCount, totals }: CardioCollapsedSummaryProps) {
  const nextSet = setCount + 1;
  if (timer && timer.phase !== "idle") {
    const status = CARDIO_PHASE_STYLES[timer.phase];
    return (
      <div className="flex items-center gap-3 px-4 pb-3.5">
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className={cn("size-2 flex-none rounded-pill", status.dot)} />
          <span role="timer" className={cn("font-display text-[30px] leading-[34px] font-bold tabular-nums", timer.phase === "paused" ? "text-fg-secondary" : "text-fg")}>
            {formatElapsed(Math.floor(timer.elapsedMs / 1000))}
          </span>
          <span className="truncate text-[13px] leading-[18px] text-fg-secondary">
            {status.label(nextSet)} · série {nextSet}
          </span>
        </span>
        <IconButton
          icon={timer.phase === "paused" ? Play : Pause}
          label={timer.phase === "paused" ? "Continuar" : "Pausar"}
          onClick={timer.phase === "paused" ? timer.resume : timer.pause}
        />
        <IconButton icon={Square} variant="primary" label="Parar e registrar série" onClick={() => timer.stop()} />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-4 pb-3.5">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline gap-1.5 text-[13px] leading-[18px] text-fg-secondary tabular-nums">
          <strong className="font-display text-[22px] leading-[26px] font-bold text-fg">{totals.time}</strong>
          {totals.rest}
        </span>
        <span className="text-xs leading-4 text-fg-muted">
          {setCount ? `${cardioSetCountLabel(setCount)}${timer ? " · toque em play para mais uma" : ""}` : "Nenhuma série ainda"}
        </span>
      </span>
      {timer && (
        <IconButton
          icon={Play}
          variant="primary"
          label={setCount ? "Iniciar nova série" : "Iniciar cronômetro"}
          disabled={timer.isBusy}
          onClick={timer.start}
        />
      )}
    </div>
  );
}
