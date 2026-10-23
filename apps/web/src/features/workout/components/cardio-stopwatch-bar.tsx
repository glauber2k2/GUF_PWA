"use client";

import { Play, Square } from "lucide-react";
import { formatElapsed } from "@guf/core";
import { Button } from "@/shared/components/ds";

export interface CardioStopwatchBarProps {
  /** "Série 1": a série que vai receber o tempo. */
  setLabel: string;
  /** Contando nesta série (segundos); null = parado. */
  elapsedSeconds: number | null;
  /** Outro cardio já está contando: o play fica indisponível (um cronômetro por vez). */
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** Faixa do cardio no card: play conta o tempo da série; parar grava o tempo na coluna Tempo. */
export function CardioStopwatchBar({ setLabel, elapsedSeconds, isBusy, onStart, onStop }: CardioStopwatchBarProps) {
  if (elapsedSeconds === null) {
    return (
      <div className="px-3 pt-1">
        <Button variant="secondary" size="lg" icon={Play} fullWidth disabled={isBusy} onClick={onStart}>
          {isBusy ? "Outro cronômetro está contando" : `Iniciar cronômetro · ${setLabel}`}
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-3 mt-1 flex min-h-14 items-center gap-3 rounded-lg border border-accent-text/40 bg-accent/10 py-1.5 pr-1.5 pl-3.5">
      <span aria-hidden="true" className="size-2 flex-none animate-guf-live rounded-pill bg-accent-text" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span role="timer" aria-label={`Cronômetro da ${setLabel}: ${formatElapsed(elapsedSeconds)}`} className="font-display text-[28px] leading-8 font-semibold tabular-nums">
          {formatElapsed(elapsedSeconds)}
        </span>
        <span className="text-xs leading-4 text-fg-secondary">{setLabel} · ao parar, o tempo vai para a série</span>
      </span>
      <Button size="lg" icon={Square} onClick={onStop} className="flex-none">
        Parar
      </Button>
    </div>
  );
}
