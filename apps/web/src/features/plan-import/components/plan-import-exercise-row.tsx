"use client";

import { useState } from "react";
import { ArrowLeftRight, ChevronDown, Trash2 } from "lucide-react";
import type { PlanImportExercise, PlanImportMatch } from "@guf/api";
import { formatClock, formatTargetReps, muscleGroupLabel, normalizeSearch, TIMES_SIGN } from "@guf/core";
import { ROUTINE_SETS_MAX, ROUTINE_SETS_MIN, TARGET_REPS_MAX_LENGTH } from "@guf/schemas";
import { Icon, IconButton, Stepper, TextField } from "@/shared/components/ds";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/helpers/class-names";
import type { PlanImportExercisePatch } from "@/features/plan-import/helpers/plan-import-draft";

const MATCH_BADGES: Record<PlanImportMatch["kind"], { label: string; variant: "muted" | "accent" }> = {
  catalog: { label: "Catálogo guf", variant: "muted" },
  own: { label: "Seu exercício", variant: "muted" },
  new: { label: "Novo", variant: "accent" },
};

interface PlanImportExerciseRowProps {
  exercise: PlanImportExercise;
  disabled: boolean;
  onChange: (patch: PlanImportExercisePatch) => void;
  onReplace: () => void;
  onRemove: () => void;
}

/**
 * Exercício da ficha: nome, origem (catálogo, seu ou novo), o que estava escrito e o planejado.
 * Tocar abre o ajuste de séries e repetições (mesmos controles do editor de rotina).
 */
export function PlanImportExerciseRow({ exercise, disabled, onChange, onReplace, onRemove }: PlanImportExerciseRowProps) {
  const [isOpen, setIsOpen] = useState(false);
  const badge = MATCH_BADGES[exercise.match.kind];
  const reps = exercise.targetReps.trim();
  const repsError = reps ? undefined : "Informe as repetições.";
  const showSource = exercise.sourceName && normalizeSearch(exercise.sourceName) !== normalizeSearch(exercise.match.name);

  return (
    <li className="flex flex-col py-2.5">
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-expanded={isOpen}
          disabled={disabled}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 bg-transparent py-0.5 text-left text-fg disabled:cursor-not-allowed"
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[15px] leading-5 font-semibold [overflow-wrap:anywhere]">{exercise.match.name}</span>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </span>
          <span className={cn("flex items-center gap-1 text-[13px] leading-[18px] tabular-nums", repsError ? "text-danger" : "text-fg-secondary")}>
            {exercise.targetSets} {TIMES_SIGN} {formatTargetReps(reps) ?? "—"} · descanso {formatClock(exercise.restSeconds)} · {muscleGroupLabel(exercise.match.muscleGroup)}
            <span className="ml-1 inline-flex flex-none items-center gap-0.5 font-medium text-accent-text">
              Ajustar
              <Icon icon={ChevronDown} size={14} className={cn("transition-transform duration-150", isOpen && "rotate-180")} />
            </span>
          </span>
          {showSource && <span className="text-xs leading-4 [overflow-wrap:anywhere] text-fg-muted">Na ficha: {exercise.sourceName}</span>}
        </button>
        <IconButton icon={ArrowLeftRight} label={`Trocar ${exercise.match.name}`} variant="ghost" disabled={disabled} onClick={onReplace} />
        <IconButton icon={Trash2} label={`Remover ${exercise.match.name}`} variant="ghost" disabled={disabled} onClick={onRemove} />
      </div>

      {isOpen && (
        <div className="mt-3 flex animate-guf-rise-fast flex-col gap-4 rounded-md border border-border bg-surface-elevated p-4">
          <Stepper
            label="Séries"
            value={exercise.targetSets}
            step={1}
            min={ROUTINE_SETS_MIN}
            max={ROUTINE_SETS_MAX}
            onChange={(targetSets) => onChange({ targetSets })}
            decreaseLabel="Menos uma série"
            increaseLabel="Mais uma série"
          />
          <TextField
            label="Repetições alvo"
            value={exercise.targetReps}
            maxLength={TARGET_REPS_MAX_LENGTH}
            disabled={disabled}
            hint="Ex.: 10, 8–12 ou falha"
            error={repsError}
            onChange={(event) => onChange({ targetReps: event.target.value })}
          />
        </div>
      )}
    </li>
  );
}
