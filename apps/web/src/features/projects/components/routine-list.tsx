"use client";

import { useRef, useState } from "react";
import { Ellipsis, GripVertical } from "lucide-react";
import { routineLetter, routineMeta, weekdaysLabel } from "@guf/core";
import type { ProjectRoutine } from "@guf/api";
import { AnimatePresence, Icon, IconButton, LAYOUT_ITEM_PROPS, LayoutItem } from "@/shared/components/ds";
import { useHoldReorder } from "@/shared/hooks/use-hold-reorder";
import { cn } from "@/shared/helpers/class-names";

/** Altura fixa do card e espaço entre cards: o "slot" do arraste (useHoldReorder). */
const ROUTINE_CARD_PX = 72;
const ROUTINE_LIST_GAP_PX = 8;

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

/** Rotinas do projeto em ordem; segurar um card liga o modo de reordenar e já arrasta (como no treino). */
export function RoutineList({ routines, nextRoutineId, nextLabel, disabled, onOpen, onMenu, onReorder }: RoutineListProps) {
  // Ordem gravada fica na tela até a lista recarregar (sem "piscar" a ordem antiga).
  const [saved, setSaved] = useState<{ source: ProjectRoutine[]; order: ProjectRoutine[] } | null>(null);
  const current = saved?.source === routines ? saved.order : routines;
  const listRef = useRef<HTMLDivElement>(null);
  const reorder = useHoldReorder({
    items: current,
    itemPx: ROUTINE_CARD_PX,
    gapPx: ROUTINE_LIST_GAP_PX,
    listRef,
    disabled: disabled || current.length < 2,
    onCommit: (ordered) => {
      setSaved({ source: routines, order: ordered });
      void onReorder(ordered).then((ok) => {
        if (!ok) setSaved(null);
      });
    },
  });

  return (
    <div ref={listRef} role="list" aria-label="Rotinas do projeto, em ordem" className="relative flex flex-col gap-2">
      {/* As outras rotinas deslizam para o lugar ao reordenar ou arquivar (Motion, no invólucro). */}
      <AnimatePresence initial={false} mode="popLayout">
        {reorder.order.map((r, i, list) => {
          const dragging = reorder.draggingId === r.id;
          const isNext = r.id === nextRoutineId;
          return (
            <LayoutItem
              key={r.id}
              role="presentation"
              {...LAYOUT_ITEM_PROPS}
              // O card arrastado acompanha o dedo sozinho; os outros deslizam.
              layout={dragging ? false : "position"}
              className="flex flex-none flex-col"
            >
              {/* Segurar o card: reordenar. Sem menu de contexto, seleção nem arraste nativo de texto. */}
              <div
                role="listitem"
                aria-label={reorder.active ? `${r.name}, posição ${i + 1} de ${list.length}` : undefined}
                {...reorder.holdProps(r.id)}
                onDragStart={(event) => event.preventDefault()}
                // Entrada escalonada; no modo de reordenar, balanço desencontrado e posição do card arrastado (valores dinâmicos).
                style={
                  reorder.active
                    ? dragging
                      ? { translate: `0 ${reorder.dragOffset}px` }
                      : { animationDelay: `${-((i * 97) % 300)}ms` }
                    : { animationDelay: `${i * 50}ms` }
                }
                className={cn(
                  "flex h-[72px] flex-none items-center gap-0.5 rounded-lg border bg-surface-elevated py-1 pr-1 pl-1 select-none [-webkit-touch-callout:none]",
                  !reorder.active && "animate-guf-rise border-border",
                  reorder.active && "relative cursor-grab touch-none transition-[scale,box-shadow,border-color] duration-150 ease-standard",
                  reorder.active &&
                    (dragging
                      ? "z-20 scale-[1.03] cursor-grabbing border-accent-text shadow-e3"
                      : "animate-guf-wiggle border-border motion-reduce:animate-none"),
                )}
              >
                <button
                  type="button"
                  tabIndex={reorder.active ? -1 : undefined}
                  onClick={reorder.active ? undefined : () => onOpen(r)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent py-2 pr-1 pl-2 text-left text-fg"
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
                    <span className="truncate text-[13px] leading-[18px] text-fg-muted tabular-nums">
                      {r.weekdays.length > 0 ? `${weekdaysLabel(r.weekdays)} · ` : ""}
                      {routineMeta(r.exercises, r.averageDurationSeconds)}
                    </span>
                  </span>
                </button>
                {/* No modo de reordenar: alça no lugar do menu (o botão fica oculto, não sai da página). */}
                {reorder.active && (
                  <span aria-hidden="true" className="grid size-11 flex-none place-items-center text-fg-muted">
                    <Icon icon={GripVertical} size={20} />
                  </span>
                )}
                <IconButton
                  icon={Ellipsis}
                  variant="ghost"
                  label={`Opções de ${r.name}`}
                  disabled={disabled}
                  onClick={() => onMenu(r)}
                  className={cn(reorder.active && "hidden")}
                />
              </div>
            </LayoutItem>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
