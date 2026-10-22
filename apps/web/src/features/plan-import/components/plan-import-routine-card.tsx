import { CalendarDays, Trash2 } from "lucide-react";
import type { PlanImportRoutine } from "@guf/api";
import { weekdaysLabel } from "@guf/core";
import { Icon, IconButton, TextField } from "@/shared/components/ds";
import { PlanImportExerciseRow } from "@/features/plan-import/components/plan-import-exercise-row";

interface PlanImportRoutineCardProps {
  routine: PlanImportRoutine;
  disabled: boolean;
  /** Última rotina da ficha: não pode sair (sem rotina não há o que criar). */
  canRemove: boolean;
  onRename: (name: string) => void;
  onRemove: () => void;
  onReplaceExercise: (exerciseKey: string) => void;
  onRemoveExercise: (exerciseKey: string) => void;
}

/** Rotina da ficha convertida: nome editável, dias e a lista de exercícios. */
export function PlanImportRoutineCard({ routine, disabled, canRemove, onRename, onRemove, onReplaceExercise, onRemoveExercise }: PlanImportRoutineCardProps) {
  const nameError = routine.name.trim() ? undefined : "Dê um nome para a rotina.";
  return (
    <section aria-label={routine.name || "Rotina"} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-e1">
      <div className="flex items-end gap-1">
        <TextField label="Rotina" value={routine.name} error={nameError} disabled={disabled} onChange={(event) => onRename(event.target.value)} className="min-w-0 flex-1" />
        {canRemove && <IconButton icon={Trash2} label={`Remover ${routine.name || "rotina"}`} variant="ghost" disabled={disabled} onClick={onRemove} />}
      </div>
      {routine.weekdays.length > 0 && (
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
              onReplace={() => onReplaceExercise(exercise.key)}
              onRemove={() => onRemoveExercise(exercise.key)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
