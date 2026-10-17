"use client";

import { GripVertical } from "lucide-react";
import { muscleGroupLabel, setsProgressLabel } from "@guf/core";
import { BottomSheet, Button, Icon, LayoutItem, Tag } from "@/components/ds";
import { usePointerReorder } from "@/hooks/use-pointer-reorder";
import { cn } from "@/lib/utils";
import type { ExerciseView } from "./workout-state";

export interface ReorderExercisesSheetProps {
  open: boolean;
  exercises: readonly ExerciseView[];
  onClose: () => void;
  /** Nova ordem (ids), só quando mudou. */
  onReorder: (exerciseIds: string[]) => void;
}

/**
 * Folha "Reordenar exercícios" do treino em andamento: lista compacta com alça de arrastar
 * (toque, mouse ou setas do teclado). Arrastar os cards abertos, com as séries, seria pesado no celular.
 */
export function ReorderExercisesSheet({ open, exercises, onClose, onReorder }: ReorderExercisesSheetProps) {
  const reorder = usePointerReorder({
    items: exercises,
    onCommit: (ordered) => onReorder(ordered.map((e) => e.id)),
  });

  return (
    <BottomSheet
      placement="screen"
      open={open}
      onClose={onClose}
      title="Reordenar exercícios"
      subtitle="Arraste pela alça para mudar a ordem"
    >
      <div role="list" aria-label="Ordem dos exercícios" className="flex flex-col gap-2">
        {reorder.order.map((e, i) => {
          const dragging = reorder.draggingId === e.id;
          const done = e.sets.filter((s) => s.isCompleted).length;
          return (
            <LayoutItem
              key={e.id}
              layout="position"
              role="listitem"
              ref={reorder.itemRef(e.id)}
              className={cn(
                "flex min-h-14 items-center gap-1 rounded-md bg-surface-elevated pr-3 transition-[box-shadow,border-color] duration-150 ease-standard",
                dragging ? "relative z-10 border-[1.5px] border-accent-text shadow-e3" : "border border-border",
              )}
            >
              <span
                role="button"
                tabIndex={0}
                aria-label={`Arrastar ${e.name} para reordenar (ou use as setas). Posição ${i + 1} de ${reorder.order.length}`}
                {...reorder.handleProps(e.id)}
                className="grid h-14 w-11 flex-none cursor-grab touch-none place-items-center text-fg-muted active:cursor-grabbing"
              >
                <Icon icon={GripVertical} size={18} />
              </span>
              <span className="w-5 flex-none font-display text-lg font-semibold text-fg-muted tabular-nums">{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 py-2">
                <span className="truncate text-[15px] leading-5 font-semibold">{e.name}</span>
                <span className="flex items-center gap-1.5">
                  <Tag size="sm">{muscleGroupLabel(e.muscleGroup)}</Tag>
                  <span className="text-xs font-medium text-fg-muted tabular-nums">{setsProgressLabel(done, e.sets.length)}</span>
                </span>
              </span>
            </LayoutItem>
          );
        })}
      </div>
      <Button size="tall" fullWidth onClick={onClose}>
        Pronto
      </Button>
    </BottomSheet>
  );
}
