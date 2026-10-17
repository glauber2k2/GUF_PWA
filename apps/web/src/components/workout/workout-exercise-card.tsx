"use client";

import { ChevronDown, Dumbbell, Ellipsis, Plus, NotepadText, Timer } from "lucide-react";
import {
  equipmentLabel,
  formatClock,
  markLoadRecords,
  muscleGroupLabel,
  previousLabel,
  setsProgressLabel,
  toDisplayWeight,
  type WeightUnit,
} from "@guf/core";
import {
  AnimatePresence,
  Button,
  Collapse,
  Icon,
  IconButton,
  PresenceRow,
  SetRow,
  SetRowHeader,
  SwipeToDelete,
  Tag,
} from "@/components/ds";
import { cn } from "@/lib/utils";
import type { EditableField, ExerciseView } from "./workout-state";

export interface WorkoutExerciseCardProps {
  exercise: ExerciseView;
  /** Unidade de exibição (o estado guarda kg). */
  unit: WeightUnit;
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
  unit,
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
      <div className="flex items-start gap-1 pr-2">
        {/* Toque em qualquer parte do cabeçalho abre/recolhe (não só na seta). */}
        <button
          type="button"
          aria-expanded={e.open}
          aria-label={`${e.open ? "Recolher" : "Expandir"} ${e.name}`}
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg bg-transparent pt-3.5 pb-3 pl-4 text-left text-fg"
        >
          <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
            <Icon icon={Dumbbell} size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <span className="truncate text-[17px] leading-[22px] font-semibold">{e.name}</span>
            <span className="flex flex-wrap items-center gap-1.5">
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
            </span>
          </span>
        </button>
        <div className="flex flex-none items-center gap-0.5 pt-3.5">
          <IconButton icon={Ellipsis} variant="ghost" label={`Opções de ${e.name}`} onClick={onOpenMenu} />
          {/* Seta só indica o estado: o cabeçalho inteiro já é o botão (fora da ordem do Tab). */}
          <span aria-hidden="true" onClick={onToggleOpen} className="grid size-11 cursor-pointer place-items-center text-fg-secondary">
            <Icon
              icon={ChevronDown}
              size={20}
              className={cn("transition-transform duration-200 ease-standard motion-reduce:transition-none", e.open && "rotate-180")}
            />
          </span>
        </div>
      </div>

      {e.note && (
        <span className="-mt-1 flex items-start gap-1.5 pr-4 pb-2.5 pl-[72px] text-[13px] leading-[18px] text-fg-secondary">
          <Icon icon={NotepadText} size={14} className="mt-0.5 text-fg-muted" />
          {e.note}
        </span>
      )}

      <Collapse open={e.open}>
        <SetRowHeader unit={unit} />
        <AnimatePresence initial={false}>
          {e.sets.map((s, i) => {
            if (s.setType === "normal") normalCount++;
            return (
              <PresenceRow key={s.id}>
                <SwipeToDelete label="Remover série" onDelete={() => onRemoveSet(i)}>
                  <SetRow
                    type={s.setType}
                    number={normalCount}
                    previous={previousLabel(s.previous && { weightKg: toDisplayWeight(s.previous.weightKg, unit), reps: s.previous.reps })}
                    weightKg={toDisplayWeight(s.weightKg, unit)}
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
      </Collapse>
    </article>
  );
}
