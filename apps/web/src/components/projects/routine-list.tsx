"use client";

import { useState } from "react";
import { Ellipsis, GripVertical } from "lucide-react";
import { routineLetter, routineMeta, weekdaysLabel } from "@guf/core";
import type { ProjectRoutine } from "@guf/api";
import { AnimatePresence, Icon, IconButton, LAYOUT_ITEM_PROPS, LayoutItem } from "@/components/ds";
import { usePointerReorder } from "@/hooks/use-pointer-reorder";
import { cn } from "@/lib/utils";

export interface RoutineListProps {
  routines: ProjectRoutine[];
  /** Rotina sugerida pela Início (só no projeto ativo). */
  nextRoutineId: string | null;
  nextLabel: string;
  disabled: boolean;
  onOpen: (routine: ProjectRoutine) => void;
  onMenu: (routine: ProjectRoutine) => void;
  /** Nova ordem ao soltar (a tela grava só as positions que mudaram). */
  onReorder: (ordered: ProjectRoutine[]) => Promise<boolean>;
}

/** Rotinas do projeto em ordem; arrastar pela alça (toque, mouse ou setas do teclado) reordena. */
export function RoutineList({ routines, nextRoutineId, nextLabel, disabled, onOpen, onMenu, onReorder }: RoutineListProps) {
  // Ordem gravada fica na tela até a lista recarregar (sem "piscar" a ordem antiga).
  const [saved, setSaved] = useState<{ source: ProjectRoutine[]; order: ProjectRoutine[] } | null>(null);
  const current = saved?.source === routines ? saved.order : routines;
  const reorder = usePointerReorder({
    items: current,
    disabled,
    onCommit: (ordered) => {
      setSaved({ source: routines, order: ordered });
      void onReorder(ordered).then((ok) => {
        if (!ok) setSaved(null);
      });
    },
  });

  return (
    <div role="list" aria-label="Rotinas do projeto, em ordem" className="relative flex flex-col gap-2">
      {/* As outras rotinas deslizam para o lugar ao reordenar ou arquivar (Motion, no invólucro). */}
      <AnimatePresence initial={false} mode="popLayout">
        {reorder.order.map((r, i) => {
          const dragging = reorder.draggingId === r.id;
          const isNext = r.id === nextRoutineId;
          return (
            <LayoutItem key={r.id} role="presentation" {...LAYOUT_ITEM_PROPS} className={cn("flex flex-col", dragging && "relative z-10")}>
              <div
                role="listitem"
                ref={reorder.itemRef(r.id)}
                style={{ animationDelay: `${i * 50}ms` }}
                className={cn(
                  "flex min-h-[72px] flex-none animate-guf-rise items-center gap-0.5 rounded-lg bg-surface-elevated py-1 pr-1",
                  "transition-[scale,box-shadow] duration-150 ease-standard",
                  dragging ? "scale-[1.02] border-[1.5px] border-accent-text shadow-e3" : "border border-border",
                )}
              >
                <span
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`Arrastar ${r.name} para reordenar (ou use as setas)`}
                  aria-disabled={disabled}
                  {...reorder.handleProps(r.id)}
                  className={cn(
                    "grid h-11 w-10 flex-none touch-none place-items-center text-fg-muted",
                    disabled ? "cursor-not-allowed opacity-40" : "cursor-grab active:cursor-grabbing",
                  )}
                >
                  <Icon icon={GripVertical} size={18} />
                </span>
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent py-2 pr-1 text-left text-fg"
                >
                  <span
                    className={cn(
                      "grid size-11 flex-none place-items-center rounded-md font-display text-[22px] font-bold",
                      isNext ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg",
                    )}
                  >
                    {routineLetter(r.name)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-base leading-5 font-semibold">{r.name}</span>
                      {isNext && (
                        <span className="flex h-5 flex-none items-center rounded-pill bg-accent/16 px-[7px] text-[11px] font-bold text-accent-text">
                          {nextLabel}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] leading-[18px] text-fg-muted tabular-nums">
                      {r.weekdays.length > 0 ? `${weekdaysLabel(r.weekdays)} · ` : ""}
                      {routineMeta(r.exercises, r.averageDurationSeconds)}
                    </span>
                  </span>
                </button>
                <IconButton icon={Ellipsis} variant="ghost" label={`Opções de ${r.name}`} disabled={disabled} onClick={() => onMenu(r)} />
              </div>
            </LayoutItem>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
