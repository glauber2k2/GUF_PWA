import { CalendarDays, Trash2 } from "lucide-react";
import type { PlanImportRoutine, ProjectRoutine } from "@guf/api";
import { weekdaysLabel } from "@guf/core";
import { Icon, IconButton, TextField } from "@/shared/components/ds";
import { PlanImportExerciseRow } from "@/features/plan-import/components/plan-import-exercise-row";
import { PlanImportRoutineTarget } from "@/features/plan-import/components/plan-import-routine-target";
import type { PlanImportExercisePatch } from "@/features/plan-import/helpers/plan-import-draft";

interface PlanImportRoutineCardProps {
  routine: PlanImportRoutine;
  /** Rotinas do projeto de destino que podem receber os exercícios (vazio = só rotina nova). */
  targetRoutines: readonly ProjectRoutine[];
  disabled: boolean;
  /** Última rotina da ficha: não pode sair (sem rotina não há o que criar). */
  canRemove: boolean;
  onRename: (name: string) => void;
  onTarget: (routineId: string | null) => void;
  onRemove: () => void;
  onChangeExercise: (exerciseKey: string, patch: PlanImportExercisePatch) => void;
  onReplaceExercise: (exerciseKey: string) => void;
  onRemoveExercise: (exerciseKey: string) => void;
}

/**
 * Rotina da ficha convertida: para onde vai (rotina nova com nome editável ou uma que já existe no
 * projeto), dias e a lista de exercícios.
 */
export function PlanImportRoutineCard({ routine, targetRoutines, disabled, canRemove, onRename, onTarget, onRemove, onChangeExercise, onReplaceExercise, onRemoveExercise }: PlanImportRoutineCardProps) {
  const target = targetRoutines.find((existing) => existing.id === routine.intoRoutineId);
  const nameError = routine.name.trim() ? undefined : "Dê um nome para a rotina.";
  const label = target?.name ?? (routine.name || "Rotina");
  return (
    <section aria-label={label} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-e1">
      <div className="flex items-end gap-1">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {targetRoutines.length > 0 && <PlanImportRoutineTarget routines={targetRoutines} value={target?.id ?? null} disabled={disabled} onChange={onTarget} />}
          {!target && <TextField label="Nome da rotina" value={routine.name} error={nameError} disabled={disabled} onChange={(event) => onRename(event.target.value)} />}
        </div>
        {canRemove && <IconButton icon={Trash2} label={`Remover ${label}`} variant="ghost" disabled={disabled} onClick={onRemove} />}
      </div>
      {target && (
        <p className="m-0 text-[13px] leading-[18px] text-pretty text-fg-secondary">
          Os exercícios abaixo entram no fim de {target.name}. O que ela já tem, o nome e os dias continuam; exercício que já está nela não se repete.
        </p>
      )}
      {!target && routine.weekdays.length > 0 && (
        <span className="flex items-center gap-1.5 text-[13px] leading-[18px] text-fg-secondary">
          <Icon icon={CalendarDays} size={14} className="text-fg-muted" />
          {weekdaysLabel(routine.weekdays)}
        </span>
      )}
      {routine.exercises.length === 0 ? (
        <p className="m-0 py-2 text-sm text-warning">Esta rotina ficou sem exercícios. Remova a rotina ou volte e cole a ficha de novo.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {routine.exercises.map((exercise) => (
            <PlanImportExerciseRow
              key={exercise.key}
              exercise={exercise}
              disabled={disabled}
              onChange={(patch) => onChangeExercise(exercise.key, patch)}
              onReplace={() => onReplaceExercise(exercise.key)}
              onRemove={() => onRemoveExercise(exercise.key)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
