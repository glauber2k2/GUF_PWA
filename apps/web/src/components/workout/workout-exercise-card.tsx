"use client";

import type { HTMLAttributes } from "react";
import { ChevronDown, Dumbbell, Ellipsis, GripVertical, Plus, NotepadText, Timer } from "lucide-react";
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
  /** Segurar o cabeçalho liga o modo de reordenar (useHoldReorder). */
  holdProps?: HTMLAttributes<HTMLElement>;
  /**
   * Modo de reordenar: o MESMO card fica compacto (só o cabeçalho, altura fixa) e balança. Não troca
   * de componente: no toque, o gesto que ligou o modo continua no elemento tocado — se ele saísse da
   * página, o navegador entregaria o resto do arraste a um elemento removido.
   */
  reorder?: {
    index: number;
    total: number;
    dragging: boolean;
    /** Deslocamento do card arrastado acompanhando o dedo (px). */
    dragOffset: number;
  };
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
  holdProps,
  reorder,
}: WorkoutExerciseCardProps) {
  const records = markLoadRecords(e.sets, e.bestKg);
  const done = e.sets.filter((s) => s.isCompleted).length;
  const allDone = e.sets.length > 0 && done === e.sets.length;
  let normalCount = 0;

  return (
    <article
      aria-label={reorder ? `${e.name}, posição ${reorder.index + 1} de ${reorder.total}` : e.name}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
      className={cn(
        "flex-none overflow-hidden rounded-lg border bg-surface-elevated select-none [-webkit-touch-callout:none]",
        !reorder && "border-border",
        !reorder && (e.flash ? "animate-guf-flash" : "animate-guf-rise-fast"),
        reorder && "relative h-[80px] cursor-grab touch-none",
        reorder && "transition-[scale,box-shadow,border-color] duration-150 ease-standard",
        reorder &&
          (reorder.dragging
            ? "z-20 scale-[1.03] cursor-grabbing border-accent-text shadow-e3"
            : "animate-guf-wiggle border-border motion-reduce:animate-none"),
      )}
      // Entrada escalonada; no modo de reordenar, balanço desencontrado e posição do card arrastado (valores dinâmicos).
      style={
        reorder
          ? reorder.dragging
            ? { translate: `0 ${reorder.dragOffset}px` }
            : { animationDelay: `${-((reorder.index * 97) % 300)}ms` }
          : e.flash
            ? undefined
            : { animationDelay: `${enterDelayMs}ms` }
      }
    >
      {/* Segurar o cabeçalho: reordenar. Sem menu de contexto nem seleção de texto ao segurar. */}
      <div {...holdProps} className="flex items-start gap-1 pr-2 select-none [-webkit-touch-callout:none]">
        {/* Toque em qualquer parte do cabeçalho abre/recolhe (não só na seta). */}
        <button
          type="button"
          aria-expanded={reorder ? undefined : e.open}
          aria-label={`${e.open ? "Recolher" : "Expandir"} ${e.name}`}
          tabIndex={reorder ? -1 : undefined}
          onClick={reorder ? undefined : onToggleOpen}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg bg-transparent pt-3.5 pb-3 pl-4 text-left text-fg"
        >
          <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
            <Icon icon={Dumbbell} size={20} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
            <span className="truncate text-[17px] leading-[22px] font-semibold">{e.name}</span>
            <span className={cn("flex items-center gap-1.5", reorder ? "flex-nowrap overflow-hidden" : "flex-wrap")}>
              <Tag size="sm">{muscleGroupLabel(e.muscleGroup)}</Tag>
              {/* No modo de reordenar, só grupo e progresso (ocultos, não removidos: ver `reorder`). */}
              <Tag size="sm" tone="muted" className={cn(reorder && "hidden")}>
                {equipmentLabel(e.equipment)}
              </Tag>
              <span className={cn("flex items-center gap-1 text-xs font-medium text-fg-muted tabular-nums", reorder && "hidden")}>
                <Icon icon={Timer} size={13} />
                {formatClock(e.restSeconds)}
              </span>
              {(!e.open || reorder) && (
                <span
                  className={cn("text-xs font-semibold whitespace-nowrap tabular-nums", allDone ? "text-accent-text" : "text-fg-muted")}
                >
                  · {setsProgressLabel(done, e.sets.length)}
                </span>
              )}
            </span>
          </span>
        </button>
        {/* No modo de reordenar: alça no lugar dos botões (eles ficam ocultos, não saem da página). */}
        {reorder && (
          <span aria-hidden="true" className="grid size-11 flex-none place-items-center self-center text-fg-muted">
            <Icon icon={GripVertical} size={20} />
          </span>
        )}
        <div className={cn("flex flex-none items-center gap-0.5 pt-3.5", reorder && "hidden")}>
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
        <span
          className={cn(
            "-mt-1 flex items-start gap-1.5 pr-4 pb-2.5 pl-[72px] text-[13px] leading-[18px] text-fg-secondary",
            reorder && "hidden",
          )}
        >
          <Icon icon={NotepadText} size={14} className="mt-0.5 text-fg-muted" />
          {e.note}
        </span>
      )}

      <Collapse open={e.open && !reorder}>
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

/** Altura fixa do card no modo de reordenar (cabeçalho só): o arraste calcula o destino por "slot". */
export const REORDER_CARD_PX = 80;
/** Espaço entre os cards na lista do treino (gap-3). */
export const WORKOUT_LIST_GAP_PX = 12;
