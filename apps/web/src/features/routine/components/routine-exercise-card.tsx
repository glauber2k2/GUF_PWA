"use client";

import { Ellipsis, GripVertical, NotepadText, Timer } from "lucide-react";
import {
  equipmentLabel,
  formatClock,
  formatTargetReps,
  muscleGroupLabel,
  ROUTINE_REST_OPTIONS,
  TIMES_SIGN,
} from "@guf/core";
import { ROUTINE_SETS_MAX, ROUTINE_SETS_MIN, TARGET_REPS_MAX_LENGTH } from "@guf/schemas";
import type { RoutineExerciseDraft } from "@guf/api";
import { Icon, IconButton, SegmentedControl, Stepper, Tag, TextField } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import type { DraftAction } from "@/features/routine/helpers/routine-draft";

const REST_OPTIONS = ROUTINE_REST_OPTIONS.map((s) => ({ value: String(s), label: formatClock(s) }));

export interface RoutineExerciseCardProps {
  exercise: RoutineExerciseDraft;
  open: boolean;
  dragging: boolean;
  disabled: boolean;
  /** Mostrar o erro de repetições (depois de tentar salvar). */
  showErrors: boolean;
  itemRef: (node: HTMLElement | null) => void;
  handleProps: Record<string, unknown>;
  onToggle: () => void;
  onMenu: () => void;
  dispatch: (action: DraftAction) => void;
}

/** Exercício planejado: resumo (séries × reps, descanso) e, aberto, os campos de edição. */
export function RoutineExerciseCard({
  exercise,
  open,
  dragging,
  disabled,
  showErrors,
  itemRef,
  handleProps,
  onToggle,
  onMenu,
  dispatch,
}: RoutineExerciseCardProps) {
  const reps = exercise.targetReps.trim();
  const repsError = showErrors && !reps ? "Informe as repetições." : undefined;
  const update = (patch: Extract<DraftAction, { type: "updateExercise" }>["patch"]) =>
    dispatch({ type: "updateExercise", id: exercise.id, patch });

  return (
    <div
      role="listitem"
      ref={itemRef}
      className={cn(
        "flex-none overflow-hidden rounded-lg bg-surface-elevated transition-[scale,box-shadow] duration-150 ease-standard",
        dragging ? "scale-[1.02] border-[1.5px] border-accent-text shadow-e3" : repsError ? "border-[1.5px] border-danger" : "border border-border",
      )}
    >
      <div className="flex min-h-[72px] items-center gap-0.5 py-1.5 pr-1">
        <span
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`Arrastar ${exercise.name} para reordenar (ou use as setas)`}
          aria-disabled={disabled}
          {...handleProps}
          className={cn(
            "grid h-11 w-10 flex-none touch-none place-items-center text-fg-muted",
            disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing",
          )}
        >
          <Icon icon={GripVertical} size={18} />
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 bg-transparent py-1.5 pr-1 text-left text-fg"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="truncate text-base leading-5 font-semibold">{exercise.name}</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <Tag size="sm">{muscleGroupLabel(exercise.muscleGroup)}</Tag>
              <span className="truncate text-[13px] text-fg-muted">{equipmentLabel(exercise.equipment)}</span>
            </span>
          </span>
          <span className="flex flex-none flex-col items-end gap-1">
            <span className="font-display text-xl leading-5 font-semibold tabular-nums">
              {exercise.targetSets} {TIMES_SIGN} {formatTargetReps(reps) ?? "—"}
            </span>
            <span className="flex items-center gap-1 text-xs text-fg-muted tabular-nums">
              <Icon icon={Timer} size={12} />
              {formatClock(exercise.restSeconds)}
            </span>
          </span>
        </button>
        <IconButton icon={Ellipsis} variant="ghost" label={`Opções de ${exercise.name}`} disabled={disabled} onClick={onMenu} />
      </div>

      {exercise.notes && (
        <span className="-mt-1 flex items-start gap-1.5 pr-4 pb-3 pl-10 text-[13px] leading-[18px] text-fg-secondary">
          <Icon icon={NotepadText} size={14} className="mt-0.5 text-fg-muted" />
          {exercise.notes}
        </span>
      )}

      {open && (
        <div className="flex animate-guf-rise-fast flex-col gap-4 border-t border-border p-4">
          <Stepper
            label="Séries"
            value={exercise.targetSets}
            step={1}
            min={ROUTINE_SETS_MIN}
            max={ROUTINE_SETS_MAX}
            onChange={(v) => update({ targetSets: v })}
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
            onChange={(e) => update({ targetReps: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-fg-secondary">Descanso</span>
            <SegmentedControl
              label="Descanso entre séries"
              shape="rounded"
              options={REST_OPTIONS}
              value={String(exercise.restSeconds)}
              onChange={(v) => update({ restSeconds: Number(v) })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
