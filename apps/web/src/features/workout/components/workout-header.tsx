"use client";

import { ChevronDown, Ellipsis, Pause, Pencil, Play, type LucideIcon } from "lucide-react";
import { Icon, IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

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
  /** Botão da esquerda: minimizar (padrão) ou sair (edição de um treino concluído). */
  minimizeIcon?: LucideIcon;
  minimizeLabel?: string;
  onTogglePause?: () => void;
  onOpenMenu?: () => void;
  /**
   * Treino concluído em edição: o tempo fica parado (sem o ponto "ao vivo") e tocar nele
   * abre a correção do tempo.
   */
  onEditElapsed?: () => void;
}

/** Cabeçalho fixo do treino: ao vivo (ou em edição), tempo grande, progresso e ações. */
export function WorkoutHeader({
  name,
  elapsedText,
  paused,
  progressText,
  progressPct = 0,
  onMinimize,
  minimizeIcon = ChevronDown,
  minimizeLabel = "Minimizar treino",
  onTogglePause,
  onOpenMenu,
  onEditElapsed,
}: WorkoutHeaderProps) {
  const editable = Boolean(onEditElapsed);
  const timeClass = cn("font-display text-[36px] leading-9 font-semibold tabular-nums", paused ? "text-fg-muted" : "text-fg");

  return (
    <header className="sticky top-0 z-[5] -mx-4 border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
      <div className="flex h-[72px] items-center gap-1 pr-2 pl-1">
        <IconButton icon={minimizeIcon} variant="ghost" label={minimizeLabel} onClick={onMinimize} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px] font-medium text-fg-secondary">
            {!editable && (
              <span
                aria-hidden="true"
                className={cn("size-2 flex-none rounded-pill", paused ? "bg-warning" : "animate-guf-live bg-accent-text")}
              />
            )}
            <span className="truncate">{name}</span>
          </span>
          <div className="flex items-center gap-2">
            {editable ? (
              <button
                type="button"
                aria-label={`Tempo do treino ${elapsedText}. Alterar tempo`}
                onClick={onEditElapsed}
                className="-ml-1 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md bg-transparent px-1 text-fg"
              >
                <span className={cn(timeClass, "underline decoration-fg-muted decoration-dotted decoration-2 underline-offset-[6px]")}>
                  {elapsedText}
                </span>
                <Icon icon={Pencil} size={16} className="text-fg-muted" />
              </button>
            ) : (
              <span role="timer" aria-label={`Tempo decorrido ${elapsedText}${paused ? ", pausado" : ""}`} className={timeClass}>
                {elapsedText}
              </span>
            )}
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
