"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { moveItem } from "@guf/core";

/**
 * Reordenar lista por toque/mouse (pointer events — funciona no celular, ao contrário do arrastar
 * nativo do HTML5) e por teclado (setas na alça). A ordem muda na tela durante o arraste e
 * `onCommit` recebe a ordem final só ao soltar, se mudou.
 * O destino usa as posições medidas NO INÍCIO do arraste: medir a cada movimento pegava os itens
 * no meio da animação de reposicionamento e o destino ficava "pulando".
 */
export function usePointerReorder<T extends { id: string }>({
  items,
  disabled = false,
  onCommit,
}: {
  items: readonly T[];
  disabled?: boolean;
  onCommit: (ordered: T[]) => void;
}) {
  const [draft, setDraft] = useState<T[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  /** Meio de cada posição da lista no início do arraste (coordenada da página). */
  const slots = useRef<number[]>([]);
  const order = draft ?? items;

  const indexAtY = (clientY: number) => {
    const y = clientY + window.scrollY;
    const mids = slots.current;
    for (let i = 0; i < mids.length; i++) if (y < mids[i]!) return i;
    return Math.max(0, mids.length - 1);
  };

  const finish = (current: readonly T[]) => {
    setDraggingId(null);
    setDraft(null);
    if (current.some((item, i) => item.id !== items[i]?.id)) onCommit([...current]);
  };

  return {
    order,
    draggingId,
    /** Registra o elemento do item (para medir a posição durante o arraste). */
    itemRef: (id: string) => (node: HTMLElement | null) => {
      if (node) nodes.current.set(id, node);
      else nodes.current.delete(id);
    },
    /** Props da alça de arrastar. */
    handleProps: (id: string) => ({
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (disabled) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        slots.current = order.map((item) => {
          const rect = nodes.current.get(item.id)?.getBoundingClientRect();
          return rect ? rect.top + window.scrollY + rect.height / 2 : Number.POSITIVE_INFINITY;
        });
        setDraft([...order]);
        setDraggingId(id);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (draggingId !== id || !draft) return;
        const from = draft.findIndex((item) => item.id === id);
        const to = indexAtY(e.clientY);
        if (from !== to) setDraft(moveItem(draft, from, to));
      },
      onPointerUp: () => {
        if (draggingId === id && draft) finish(draft);
      },
      onPointerCancel: () => {
        setDraggingId(null);
        setDraft(null);
      },
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        if (disabled || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
        e.preventDefault();
        const from = order.findIndex((item) => item.id === id);
        const next = moveItem(order, from, from + (e.key === "ArrowUp" ? -1 : 1));
        finish(next);
      },
    }),
  };
}
