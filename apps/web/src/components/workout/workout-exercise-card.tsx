"use client";

import { ChevronDown, ChevronUp, Dumbbell, Ellipsis, Plus, StickyNote, Timer } from "lucide-react";
import { equipmentLabel, formatClock, markLoadRecords, muscleGroupLabel, previousLabel, setsProgressLabel } from "@guf/core";
import { Button, Icon, IconButton, SetRow, SetRowHeader, SwipeToDelete, Tag } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { EditableField, ExerciseView } from "./workout-state";

export interface WorkoutExerciseCardProps {
  exercise: ExerciseView;
  /** Atraso da animação de entrada (ms), escalonado pela posição. */
  enterDelayMs: number;
  /** "exercício:série" que acabou de ser concluída (anima o check). */
  poppedKey: string | null;
  /** Série em edição neste exercício (borda de foco na célula). */
  editing: { setIndex: number; field: EditableField } | null;
  onToggleOpen: () => void;
  onOpenMenu: () => void;
  onOpenNote: () => void;
  onAddSet: () => void;
  onToggleSet: (setIndex: number) => void;
  onCycleType: (setIndex: number) => void;
  onEditField: (setIndex: number, field: EditableField) => void;
  onRemoveSet: (setIndex: number) => void;
}

/** Card do exercício no treino: cabeçalho, observação e séries (arrastar para remover). */
export function WorkoutExerciseCard({
  exercise: e,
  enterDelayMs,
  poppedKey,
  editing,
  onToggleOpen,
  onOpenMenu,
  onOpenNote,
  onAddSet,
  onToggleSet,
  onCycleType,
  onEditField,
  onRemoveSet,
}: WorkoutExerciseCardProps) {
  const records = markLoadRecords(e.sets, e.bestKg);
  const done = e.sets.filter((s) => s.isCompleted).length;
  const allDone = e.sets.length > 0 && done === e.sets.length;
  let normalCount = 0;

  return (
    <article
      aria-label={e.name}
      className={cn(
        "flex-none overflow-hidden rounded-lg border border-border bg-surface-elevated",
        e.flash ? "animate-guf-flash" : "animate-guf-rise-fast",
      )}
      style={e.flash ? undefined : { animationDelay: `${enterDelayMs}ms` }}
    >
      <div className="flex items-start gap-3 pt-3.5 pr-2 pb-3 pl-4">
        <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
          <Icon icon={Dumbbell} size={20} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
          <span className="truncate text-[17px] leading-[22px] font-semibold">{e.name}</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag size="sm">{muscleGroupLabel(e.muscleGroup)}</Tag>
            <Tag size="sm" tone="muted">
              {equipmentLabel(e.equipment)}
            </Tag>
            <span className="flex items-center gap-1 text-xs font-medium text-fg-muted tabular-nums">
              <Icon icon={Timer} size={13} />
              {formatClock(e.restSeconds)}
            </span>
            {!e.open && (
              <span className={cn("text-xs font-semibold tabular-nums", allDone ? "text-accent-text" : "text-fg-muted")}>
                · {setsProgressLabel(done, e.sets.length)}
              </span>
            )}
          </div>
        </div>
        <IconButton icon={Ellipsis} variant="ghost" label={`Opções de ${e.name}`} onClick={onOpenMenu} />
        <IconButton
          icon={e.open ? ChevronUp : ChevronDown}
          variant="ghost"
          label={`${e.open ? "Recolher" : "Expandir"} ${e.name}`}
          aria-expanded={e.open}
          onClick={onToggleOpen}
        />
      </div>

      {e.note && (
        <span className="-mt-1 flex items-start gap-1.5 pr-4 pb-2.5 pl-[72px] text-[13px] leading-[18px] text-fg-secondary">
          <Icon icon={StickyNote} size={14} className="mt-0.5 text-fg-muted" />
          {e.note}
        </span>
      )}

      {e.open && (
        <>
          <SetRowHeader />
          {e.sets.map((s, i) => {
            if (s.setType === "normal") normalCount++;
            return (
              <SwipeToDelete key={s.id} label="Remover série" onDelete={() => onRemoveSet(i)}>
                <SetRow
                  type={s.setType}
                  number={normalCount}
                  previous={previousLabel(s.previous)}
                  weightKg={s.weightKg}
                  reps={s.reps}
                  done={s.isCompleted}
                  pr={records[i]}
                  pop={poppedKey === `${e.id}:${i}`}
                  field={editing?.setIndex === i ? { key: editing.field === "weightKg" ? "kg" : "reps", state: "editing" } : undefined}
                  onToggle={() => onToggleSet(i)}
                  onCycleType={() => onCycleType(i)}
                  onEditField={(key) => onEditField(i, key === "kg" ? "weightKg" : "reps")}
                />
              </SwipeToDelete>
            );
          })}
          <div className="flex gap-2 px-3 pt-2.5 pb-3.5">
            <Button variant="secondary" icon={Plus} fullWidth onClick={onAddSet}>
              Adicionar série
            </Button>
            <IconButton icon={StickyNote} label={`Observação de ${e.name}`} onClick={onOpenNote} />
          </div>
        </>
      )}
    </article>
  );
}
