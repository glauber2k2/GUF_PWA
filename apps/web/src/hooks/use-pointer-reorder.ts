"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { moveItem } from "@guf/core";

/**
 * Reordenar lista por toque/mouse (pointer events — funciona no celular, ao contrário do arrastar
 * nativo do HTML5) e por teclado (setas na alça). A ordem muda na tela durante o arraste e
 * `onCommit` recebe a ordem final só ao soltar, se mudou.
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
  const order = draft ?? items;

  const indexAtY = (y: number, current: readonly T[]) => {
    for (let i = 0; i < current.length; i++) {
      const rect = nodes.current.get(current[i]!.id)?.getBoundingClientRect();
      if (rect && y < rect.top + rect.height / 2) return i;
    }
    return current.length - 1;
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
        setDraft([...order]);
        setDraggingId(id);
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        if (draggingId !== id || !draft) return;
        const from = draft.findIndex((item) => item.id === id);
        const to = indexAtY(e.clientY, draft);
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
