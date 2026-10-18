"use client";

import type { KeyboardEvent } from "react";
import { Activity, Pause, Play, Timer } from "lucide-react";
import { formatElapsed } from "@guf/core";
import { Icon, IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { useActiveWorkout, useWorkoutClock } from "@/features/workout/providers/workout-provider";

/**
 * Mini card do treino em andamento, flutuando acima da navegação em qualquer tela do app.
 * Tocar abre o treino; o botão pausa/retoma sem sair da tela atual.
 */
export function MiniWorkoutCard({ onOpen, className }: { onOpen: (sessionId: string) => void; className?: string }) {
  const { active, togglePause } = useActiveWorkout();
  const { elapsed, paused, restLeft } = useWorkoutClock(active);
  if (!active) return null;

  const resting = !paused && restLeft > 0;
  const open = () => onOpen(active.sessionId);
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };
  const restPct = resting && active.rest ? (restLeft / active.rest.total) * 100 : 0;

  return (
    <div className={cn("animate-guf-up", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Abrir treino em andamento: ${active.name}`}
        onClick={open}
        onKeyDown={onKeyDown}
        className={cn(
          "relative flex h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-border-strong",
          "bg-surface-elevated pr-2.5 pl-3.5 shadow-e3 transition-transform duration-100 ease-standard",
          "active:scale-[.98] motion-reduce:active:scale-100",
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-2.5 flex-none rounded-pill", paused ? "bg-warning" : "animate-guf-live bg-accent-text")}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm leading-[18px] font-semibold">{active.name}</span>
          <span
            className={cn(
              "flex items-center gap-1 text-xs leading-4 font-semibold whitespace-nowrap tabular-nums",
              paused ? "text-warning" : "text-accent-text",
            )}
          >
            <Icon icon={paused ? Pause : resting ? Timer : Activity} size={12} />
            {paused ? "Pausado" : resting ? `Descanso · ${formatElapsed(restLeft)}` : "Ao vivo"}
          </span>
        </div>
        <span
          aria-label={`Tempo decorrido ${formatElapsed(elapsed)}`}
          className={cn("font-display text-[26px] leading-[26px] font-semibold tabular-nums", paused ? "text-fg-muted" : "text-fg")}
        >
          {formatElapsed(elapsed)}
        </span>
        <span className="flex" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <IconButton icon={paused ? Play : Pause} label={paused ? "Retomar treino" : "Pausar treino"} onClick={togglePause} />
        </span>
        {resting && (
          <>
            <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-surface-3" />
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-0 h-[3px] bg-accent transition-[width] duration-1000 ease-linear"
              style={{ width: `${restPct.toFixed(1)}%` }}
            />
          </>
        )}
      </div>
    </div>
  );
}
