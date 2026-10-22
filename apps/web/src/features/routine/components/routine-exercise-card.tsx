"use client";

import { useState } from "react";
import { Ellipsis, GripVertical, NotepadText, Timer } from "lucide-react";
import {
  equipmentLabel,
  formatClock,
  formatNumber,
  formatPlannedSets,
  fromDisplayWeight,
  muscleGroupLabel,
  parseKeypadValue,
  ROUTINE_REST_OPTIONS,
  toDisplayWeight,
  toKeypadValue,
  type WeightUnit,
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
  /** Unidade de exibição da carga planejada (o rascunho guarda kg). */
  unit: WeightUnit;
  /** Carga planejada só importa quando a rotina não atualiza carga automaticamente. */
  showTargetWeight: boolean;
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
  unit,
  showTargetWeight,
  itemRef,
  handleProps,
  onToggle,
  onMenu,
  dispatch,
}: RoutineExerciseCardProps) {
  const targetWeight = showTargetWeight ? toDisplayWeight(exercise.targetWeightKg, unit) : null;
  const update = (patch: Extract<DraftAction, { type: "updateExercise" }>["patch"]) =>
    dispatch({ type: "updateExercise", id: exercise.id, patch });

  return (
    <div
      role="listitem"
      ref={itemRef}
      className={cn(
        "flex-none overflow-hidden rounded-lg bg-surface-elevated transition-[scale,box-shadow] duration-150 ease-standard",
        dragging ? "scale-[1.02] border-[1.5px] border-accent-text shadow-e3" : "border border-border",
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
              {formatPlannedSets(exercise.targetSets, exercise.targetReps)}
            </span>
            <span className="flex items-center gap-1 text-xs text-fg-muted tabular-nums">
              {targetWeight !== null && <span>{formatNumber(targetWeight)} {unit} ·</span>}
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
            hint="Opcional. Ex.: 10, 8–12 ou falha"
            onChange={(e) => update({ targetReps: e.target.value })}
          />
          {showTargetWeight && (
            <TargetWeightField valueKg={exercise.targetWeightKg} unit={unit} disabled={disabled} onChange={(kg) => update({ targetWeightKg: kg })} />
          )}
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

/** Carga planejada (opcional) na unidade do usuário; vazio = começar sem carga. */
function TargetWeightField({
  valueKg,
  unit,
  disabled,
  onChange,
}: {
  valueKg: number | null;
  unit: WeightUnit;
  disabled: boolean;
  onChange: (kg: number | null) => void;
}) {
  // Texto local: o número sozinho perderia a vírgula enquanto a pessoa digita ("82,").
  const [text, setText] = useState(() => toKeypadValue(toDisplayWeight(valueKg, unit)));
  return (
    <TextField
      label={`Carga planejada (${unit})`}
      inputMode="decimal"
      value={text}
      maxLength={7}
      disabled={disabled}
      hint="Opcional. Vazio: o treino começa sem carga."
      onChange={(e) => {
        const next = e.target.value.replace(/[^\d,.]/g, "");
        setText(next);
        onChange(next.trim() ? fromDisplayWeight(parseKeypadValue(next), unit) : null);
      }}
    />
  );
}
