import { ChevronDown, Play } from "lucide-react";
import { formatPlannedSets, muscleGroupLabel, routineLetter, routineMeta, routineShortName, START_SHEET_MAX_MUSCLES, uniqueMuscleCodes } from "@guf/core";
import type { ProjectRoutine } from "@guf/api";
import { Button, Collapse, Icon, IconButton, MuscleIcon, muscleIconKey } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { PEEK_ITEM_PROPS } from "@/features/app-shell/helpers/peek-height";

/** Atraso entre os selos de músculo ao abrir (a silhueta acende em sequência). */
const MUSCLE_STAGGER_MS = 140;

export interface StartRoutineCardProps {
  routine: ProjectRoutine;
  isNext: boolean;
  isOpen: boolean;
  /** Posição na lista (entrada escalonada). */
  index: number;
  onToggle: () => void;
  onStart: () => void;
}

/**
 * Rotina na folha "Iniciar treino" (protótipo 2b): letra, nome, "Próximo", exercícios e tempo médio;
 * play inicia direto e tocar na linha mostra os músculos e os exercícios antes de começar.
 */
export function StartRoutineCard({ routine, isNext, isOpen, index, onToggle, onStart }: StartRoutineCardProps) {
  const isHighlighted = isNext || isOpen;
  const startLabel = `Iniciar ${routineShortName(routine.name)}`;
  return (
    <div
      {...PEEK_ITEM_PROPS}
      className={cn(
        "flex-none animate-guf-rise-fast overflow-hidden rounded-lg transition-[border-color,background-color] duration-200 ease-standard",
        isHighlighted ? "border-[1.5px] border-accent-text" : "border border-border",
        isNext ? "bg-accent/8" : "bg-surface",
      )}
      // Entrada escalonada (valor dinâmico).
      style={{ animationDelay: `${60 + index * 50}ms` }}
    >
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={onToggle}
          className="flex min-h-16 min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent py-2.5 pr-1 pl-3 text-left text-fg"
        >
          <span
            className={cn(
              "grid size-11 flex-none place-items-center rounded-md font-display text-2xl font-bold transition-colors duration-200 ease-standard",
              isHighlighted ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg",
            )}
          >
            {routineLetter(routine.name)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="flex min-w-0 items-center gap-2">
              <strong className="truncate text-[15px] leading-5 font-semibold">{routine.name}</strong>
              {isNext && <NextBadge />}
            </span>
            <span className="truncate text-[13px] leading-[18px] text-fg-secondary">{routineMeta(routine.exercises, routine.averageDurationSeconds)}</span>
          </span>
          <Icon
            icon={ChevronDown}
            size={18}
            className={cn("flex-none text-fg-muted transition-transform duration-300 ease-standard motion-reduce:transition-none", isOpen && "rotate-180")}
          />
        </button>
        <IconButton icon={Play} label={startLabel} variant={isNext ? "primary" : "secondary"} onClick={onStart} />
      </div>
      <Collapse open={isOpen}>
        <RoutineDetails routine={routine} startLabel={startLabel} onStart={onStart} />
      </Collapse>
    </div>
  );
}

function NextBadge() {
  return (
    <span className="flex h-5 flex-none items-center gap-1 rounded-[6px] bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
      <span className="size-[5px] animate-guf-live rounded-pill bg-accent-foreground motion-reduce:animate-none" />
      Próximo
    </span>
  );
}

function RoutineDetails({ routine, startLabel, onStart }: { routine: ProjectRoutine; startLabel: string; onStart: () => void }) {
  return (
    <div className="flex flex-col gap-2.5 px-3 pb-3">
      <div className="flex flex-wrap gap-1.5">
        {uniqueMuscleCodes(routine.exercises.map((e) => e.muscleGroup), START_SHEET_MAX_MUSCLES).map((group, i) => {
          const muscle = muscleIconKey(group);
          return (
            <span key={group} className="flex h-8 items-center gap-1 rounded-[8px] bg-surface-3 pr-2.5 pl-1 text-xs font-medium text-fg-secondary">
              {muscle && <MuscleIcon muscle={muscle} zoom size={26} delay={i * MUSCLE_STAGGER_MS} label="" />}
              {muscleGroupLabel(group)}
            </span>
          );
        })}
      </div>
      <ol className="m-0 flex list-none flex-col border-t border-border p-0">
        {routine.exercises.map((exercise, i) => (
          <li key={`${exercise.name}-${i}`} className="flex min-h-[38px] items-center gap-3 border-b border-border">
            <span className="w-[22px] flex-none text-center font-display text-[15px] font-semibold text-fg-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-sm leading-[18px]">{exercise.name}</span>
            <span className="flex-none font-display text-[15px] font-semibold text-fg-secondary">{formatPlannedSets(exercise.targetSets, exercise.targetReps)}</span>
          </li>
        ))}
      </ol>
      <Button variant="primary" size="tall" icon={Play} fullWidth onClick={onStart}>
        {startLabel}
      </Button>
    </div>
  );
}
