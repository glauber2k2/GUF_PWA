"use client";

import { useEffect } from "react";
import { isStopwatchOrphan } from "@/features/workout/helpers/cardio-stopwatch";
import type { CardioStopwatch } from "@/features/workout/hooks/use-cardio-stopwatch";
import type { WorkoutEditing } from "@/features/workout/hooks/use-workout-editing";

export type CardioTimerPhase = "idle" | "running" | "paused";

/** O que o card de cardio precisa do cronômetro (sem saber onde ele é guardado). */
export interface CardioTimerControls {
  phase: CardioTimerPhase;
  /** Tempo contado nesta série (ms); 0 parado. */
  elapsedMs: number;
  /** Outro exercício está cronometrando (um cronômetro por vez). */
  isBusy: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Para e registra a série; devolve o id dela (para abrir o campo de km). */
  stop: () => string | null;
  /** Descarta o tempo sem registrar. */
  discard: () => void;
}

/**
 * Liga o cronômetro do treino (um por vez) aos cards de cardio: devolve, para cada exercício, os
 * controles dele. Parar registra a série pela edição do treino (mesma fila das outras séries).
 * Sem cronômetro (edição de treino concluído), devolve undefined e o card fica só no modo manual.
 */
export function useCardioTimerControls(stopwatch: CardioStopwatch | undefined, editing: WorkoutEditing) {
  const running = stopwatch?.running ?? null;

  // Exercício que saiu do treino (removido ou trocado): o cronômetro para sem gravar.
  const isOrphan = isStopwatchOrphan(editing.state.exercises, running);
  const cancel = stopwatch?.cancel;
  useEffect(() => {
    if (isOrphan) cancel?.();
  }, [isOrphan, cancel]);

  return (exerciseId: string): CardioTimerControls | undefined => {
    if (!stopwatch) return undefined;
    const isHere = running?.exerciseId === exerciseId;
    const phase: CardioTimerPhase = !isHere ? "idle" : running.resumedAt === null ? "paused" : "running";
    return {
      phase,
      elapsedMs: isHere ? stopwatch.elapsedMs : 0,
      isBusy: running !== null && !isHere,
      start: () => stopwatch.start(exerciseId),
      pause: stopwatch.pause,
      resume: stopwatch.resume,
      stop: () => {
        const result = stopwatch.stop();
        return result ? editing.logCardioSet(result.exerciseId, { durationSeconds: result.seconds, distanceKm: null }) : null;
      },
      discard: stopwatch.cancel,
    };
  };
}
