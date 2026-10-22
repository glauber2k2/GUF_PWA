import { ArrowLeftRight, Trash2 } from "lucide-react";
import type { PlanImportExercise, PlanImportMatch } from "@guf/api";
import { formatClock, muscleGroupLabel, normalizeSearch } from "@guf/core";
import { IconButton } from "@/shared/components/ds";
import { Badge } from "@/shared/components/ui/badge";

const MATCH_BADGES: Record<PlanImportMatch["kind"], { label: string; variant: "muted" | "accent" }> = {
  catalog: { label: "Catálogo guf", variant: "muted" },
  own: { label: "Seu exercício", variant: "muted" },
  new: { label: "Novo", variant: "accent" },
};

interface PlanImportExerciseRowProps {
  exercise: PlanImportExercise;
  disabled: boolean;
  onReplace: () => void;
  onRemove: () => void;
}

/** Exercício da ficha: nome, origem (catálogo, seu ou novo), o que estava escrito e o planejado. */
export function PlanImportExerciseRow({ exercise, disabled, onReplace, onRemove }: PlanImportExerciseRowProps) {
  const badge = MATCH_BADGES[exercise.match.kind];
  const showSource = exercise.sourceName && normalizeSearch(exercise.sourceName) !== normalizeSearch(exercise.match.name);
  return (
    <li className="flex items-start gap-1 py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] leading-5 font-semibold [overflow-wrap:anywhere] text-fg">{exercise.match.name}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">
          {exercise.targetSets} × {exercise.targetReps} · descanso {formatClock(exercise.restSeconds)} · {muscleGroupLabel(exercise.match.muscleGroup)}
        </span>
        {showSource && <span className="text-xs leading-4 [overflow-wrap:anywhere] text-fg-muted">Na ficha: {exercise.sourceName}</span>}
      </div>
      <IconButton icon={ArrowLeftRight} label={`Trocar ${exercise.match.name}`} variant="ghost" disabled={disabled} onClick={onReplace} />
      <IconButton icon={Trash2} label={`Remover ${exercise.match.name}`} variant="ghost" disabled={disabled} onClick={onRemove} />
    </li>
  );
}
