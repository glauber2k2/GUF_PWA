"use client";

import { ExerciseImage } from "@/shared/components/exercise-image";
import { Plus, NotepadText, Timer } from "lucide-react";
import {
  EMPTY_SET_VALUES,
  equipmentLabel,
  formatClock,
  markRecordSets,
  muscleGroupLabel,
  setMetricFor,
  setsProgressLabel,
  type WeightUnit,
} from "@guf/core";
import {
  AnimatePresence,
  Button,
  Icon,
  IconButton,
  PresenceRow,
  SetRow,
  SetRowHeader,
  metricCells,
  metricColumns,
  SwipeToDelete,
  Tag,
} from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { ExerciseCardShell, type ExerciseCardFrameProps } from "@/features/workout/components/exercise-card-shell";
import type { EditableField, ExerciseView } from "@/features/workout/helpers/workout-state";

export { REORDER_CARD_PX, WORKOUT_LIST_GAP_PX } from "@/features/workout/components/exercise-card-shell";

export interface WorkoutExerciseCardProps extends ExerciseCardFrameProps {
  exercise: ExerciseView;
  /** Unidade de exibição (o estado guarda kg). */
  unit: WeightUnit;
  /** "exercício:série" que acabou de ser concluída (anima o check). */
  poppedKey: string | null;
  /** Série em edição neste exercício (borda de foco na célula). */
  editing: { setIndex: number; field: EditableField } | null;
  onOpenNote: () => void;
  onAddSet: () => void;
  onToggleSet: (setIndex: number) => void;
  onCycleType: (setIndex: number) => void;
  onEditField: (setIndex: number, field: EditableField) => void;
  onRemoveSet: (setIndex: number) => void;
}

/** Card de um exercício de força no treino: séries com carga e repetições (arrastar para remover). */
export function WorkoutExerciseCard({
  exercise: e,
  unit,
  poppedKey,
  editing,
  onOpenNote,
  onAddSet,
  onToggleSet,
  onCycleType,
  onEditField,
  onRemoveSet,
  ...frame
}: WorkoutExerciseCardProps) {
  const metric = setMetricFor(e.muscleGroup);
  const records = markRecordSets(e.sets, e.best1RmKg);
  const done = e.sets.filter((s) => s.isCompleted).length;
  const allDone = e.sets.length > 0 && done === e.sets.length;
  let normalCount = 0;

  return (
    <ExerciseCardShell
      {...frame}
      name={e.name}
      open={e.open}
      flash={e.flash}
      note={e.note}
      image={<ExerciseImage name={e.name} muscleGroup={e.muscleGroup} size={44} />}
      meta={(compact) => (
        <>
          <Tag size="sm">{muscleGroupLabel(e.muscleGroup)}</Tag>
          {/* No modo de reordenar, só grupo e progresso (ocultos, não removidos: ver ExerciseCardShell). */}
          <Tag size="sm" tone="muted" className={cn(compact && "hidden")}>
            {equipmentLabel(e.equipment)}
          </Tag>
          <span className={cn("flex items-center gap-1 text-xs font-medium text-fg-muted tabular-nums", compact && "hidden")}>
            <Icon icon={Timer} size={13} />
            {formatClock(e.restSeconds)}
          </span>
          {(!e.open || compact) && (
            <span className={cn("text-xs font-semibold whitespace-nowrap tabular-nums", allDone ? "text-accent-text" : "text-fg-muted")}>
              · {setsProgressLabel(done, e.sets.length)}
            </span>
          )}
        </>
      )}
    >
      <SetRowHeader columns={metricColumns(metric, unit)} />
      <AnimatePresence initial={false}>
        {e.sets.map((s, i) => {
          if (s.setType === "normal") normalCount++;
          return (
            <PresenceRow key={s.id}>
              <SwipeToDelete label="Remover série" onDelete={() => onRemoveSet(i)}>
                <SetRow
                  type={s.setType}
                  number={normalCount}
                  previous={metric.formatCompact(s.previous ?? EMPTY_SET_VALUES, unit)}
                  cells={metricCells(metric, s, unit)}
                  done={s.isCompleted}
                  pr={records[i]}
                  pop={poppedKey === `${e.id}:${i}`}
                  field={editing?.setIndex === i ? { key: editing.field, state: "editing" } : undefined}
                  onToggle={() => onToggleSet(i)}
                  onCycleType={() => onCycleType(i)}
                  onEditField={(key) => onEditField(i, key as EditableField)}
                />
              </SwipeToDelete>
            </PresenceRow>
          );
        })}
      </AnimatePresence>
      <div className="flex gap-2 px-3 pt-2.5 pb-3.5">
        <Button variant="secondary" icon={Plus} fullWidth onClick={onAddSet}>
          Adicionar série
        </Button>
        <IconButton icon={NotepadText} label={`Observação de ${e.name}`} onClick={onOpenNote} />
      </div>
    </ExerciseCardShell>
  );
}
