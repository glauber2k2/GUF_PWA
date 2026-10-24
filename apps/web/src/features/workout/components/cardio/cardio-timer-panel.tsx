"use client";

import { Pause, Play, RotateCcw, Square } from "lucide-react";
import { formatElapsed } from "@guf/core";
import { Button, IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { CARDIO_PHASE_STYLES } from "@/features/workout/components/cardio/cardio-timer-status";
import type { CardioTimerControls } from "@/features/workout/hooks/use-cardio-timer-controls";

const RING_RADIUS = 21;
const SECONDS_PER_LAP = 60;
const HOUR_SECONDS = 3600;

export interface CardioTimerPanelProps {
  timer: CardioTimerControls;
  /** Número da próxima série (rótulo "Série N" parado). */
  nextSetNumber: number;
  /** Soma das séries já registradas (s), para "Total" enquanto conta. */
  loggedSeconds: number;
  /** Tempo da última série (s); null sem séries. */
  lastSeconds: number | null;
}

/**
 * Cronômetro do cardio aberto: anel do guf que dá uma volta por minuto, tempo no centro e, na zona
 * do polegar, iniciar ou descartar · pausar/continuar · parar (parar registra a série).
 */
export function CardioTimerPanel({ timer, nextSetNumber, loggedSeconds, lastSeconds }: CardioTimerPanelProps) {
  const { phase, elapsedMs } = timer;
  const isActive = phase !== "idle";
  const seconds = elapsedMs / 1000;
  const lap = (seconds % SECONDS_PER_LAP) / SECONDS_PER_LAP;
  const angle = lap * Math.PI * 2;
  const status = CARDIO_PHASE_STYLES[phase];
  const subtitle = isActive
    ? loggedSeconds
      ? `Total ${formatElapsed(loggedSeconds + seconds)}`
      : "Pare para registrar"
    : lastSeconds
      ? `Último ${formatElapsed(lastSeconds)}`
      : "Pronto";

  return (
    <div className="flex animate-guf-rise-fast flex-col items-center gap-4 px-4 pt-1 pb-4">
      <div className="relative grid aspect-square w-[min(232px,72%)] place-items-center [container-type:inline-size]">
        <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
          <circle cx="24" cy="24" r={RING_RADIUS} fill="none" strokeWidth="2.2" className="stroke-surface-3" />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="2.2"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={(100 - lap * 100).toFixed(2)}
            className={cn("stroke-accent transition-opacity duration-300 ease-standard", isActive ? "opacity-100" : "opacity-0")}
          />
          <circle
            cx={(24 + RING_RADIUS * Math.cos(angle)).toFixed(2)}
            cy={(24 + RING_RADIUS * Math.sin(angle)).toFixed(2)}
            r="1.9"
            className={cn("fill-accent", isActive ? "opacity-100" : "opacity-0")}
          />
        </svg>
        <div className="flex max-w-[64%] flex-col items-center gap-1 text-center">
          <span className={cn("flex items-center gap-1.5 text-[11px] leading-4 font-semibold tracking-[0.08em] uppercase", status.text)}>
            <span className={cn("size-1.5 rounded-pill", status.dot)} />
            {status.label(nextSetNumber)}
          </span>
          <span
            role="timer"
            aria-live="off"
            className={cn(
              "font-display leading-[1.05] font-bold tracking-[-0.01em] whitespace-nowrap tabular-nums transition-colors duration-200",
              seconds >= HOUR_SECONDS ? "text-[16cqi]" : "text-[21cqi]",
              phase === "paused" ? "text-fg-secondary" : "text-fg",
            )}
          >
            {formatElapsed(Math.floor(seconds))}
          </span>
          <span className="max-w-[88%] text-xs leading-4 text-balance text-fg-muted">{subtitle}</span>
        </div>
      </div>

      {isActive ? (
        <div className="grid w-full grid-cols-[56px_minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
          <IconButton icon={RotateCcw} label="Descartar tempo" size="lg" onClick={timer.discard} />
          <Button
            variant="secondary"
            size="lg"
            icon={phase === "paused" ? Play : Pause}
            fullWidth
            onClick={phase === "paused" ? timer.resume : timer.pause}
          >
            {phase === "paused" ? "Continuar" : "Pausar"}
          </Button>
          <Button size="lg" icon={Square} fullWidth onClick={() => timer.stop()}>
            Parar
          </Button>
        </div>
      ) : (
        <Button size="lg" icon={Play} fullWidth disabled={timer.isBusy} onClick={timer.start}>
          {timer.isBusy ? "Outro cronômetro está contando" : nextSetNumber > 1 ? "Iniciar nova série" : "Iniciar cronômetro"}
        </Button>
      )}
      <span className="text-center text-xs leading-4 text-pretty text-fg-muted">
        {isActive
          ? "Ao parar, o tempo vira uma série. A distância você completa depois, se quiser."
          : "Pode bloquear a tela: o tempo continua contando."}
      </span>
    </div>
  );
}
