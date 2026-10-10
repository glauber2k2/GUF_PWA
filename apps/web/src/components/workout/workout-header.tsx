"use client";

import { ChevronDown, Ellipsis, Pause, Play } from "lucide-react";
import { Icon, IconButton } from "@/components/ds";
import { cn } from "@/lib/utils";

export interface WorkoutHeaderProps {
  name: string;
  /** "32:14" */
  elapsedText: string;
  paused: boolean;
  /** "12 de 22 séries" */
  progressText?: string;
  /** 0–100 */
  progressPct?: number;
  onMinimize: () => void;
  onTogglePause?: () => void;
  onOpenMenu?: () => void;
}

/** Cabeçalho fixo do treino: ao vivo, tempo grande, progresso e ações. */
export function WorkoutHeader({
  name,
  elapsedText,
  paused,
  progressText,
  progressPct = 0,
  onMinimize,
  onTogglePause,
  onOpenMenu,
}: WorkoutHeaderProps) {
  return (
    <header className="sticky top-0 z-[5] -mx-4 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
      <div className="flex h-[72px] items-center gap-1 pr-2 pl-1">
        <IconButton icon={ChevronDown} variant="ghost" label="Minimizar treino" onClick={onMinimize} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px] font-medium text-fg-secondary">
            <span
              aria-hidden="true"
              className={cn("size-2 flex-none rounded-pill", paused ? "bg-warning" : "animate-guf-live bg-accent-text")}
            />
            <span className="truncate">{name}</span>
          </span>
          <div className="flex items-center gap-2">
            <span
              role="timer"
              aria-label={`Tempo decorrido ${elapsedText}${paused ? ", pausado" : ""}`}
              className={cn("font-display text-[36px] leading-9 font-semibold tabular-nums", paused ? "text-fg-muted" : "text-fg")}
            >
              {elapsedText}
            </span>
            {paused ? (
              <span className="flex h-6 items-center gap-1 rounded-pill bg-warning/16 px-2 text-xs font-semibold text-warning">
                <Icon icon={Pause} size={12} />
                Pausado
              </span>
            ) : (
              progressText && <span className="text-[13px] whitespace-nowrap text-fg-muted tabular-nums">{progressText}</span>
            )}
          </div>
        </div>
        {onTogglePause && (
          <IconButton icon={paused ? Play : Pause} label={paused ? "Retomar treino" : "Pausar treino"} onClick={onTogglePause} />
        )}
        {onOpenMenu && <IconButton icon={Ellipsis} variant="ghost" label="Mais opções do treino" onClick={onOpenMenu} />}
      </div>
      <span
        aria-hidden="true"
        className="absolute -bottom-px left-0 h-0.5 bg-accent transition-[width] duration-250 ease-standard"
        style={{ width: `${progressPct.toFixed(1)}%` }}
      />
    </header>
  );
}
