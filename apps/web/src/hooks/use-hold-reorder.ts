"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type RefObject } from "react";
import { moveItem } from "@guf/core";

/*
 * Segurar para reordenar (lista do treino em andamento):
 * - segurar um item por HOLD_MS (sem mexer o dedo) liga o modo de reordenar e já começa a arrastar
 *   esse item no mesmo gesto; mexer antes disso é rolagem normal da página;
 * - soltar grava a nova ordem (se mudou) e já sai do modo; Esc ou gesto cancelado pelo sistema
 *   sai sem mudar a ordem;
 * - o item arrastado acompanha o dedo; os outros abrem espaço (a tela anima as posições);
 * - o destino é calculado por SLOT fixo (altura do item compacto + espaço) a partir do topo da
 *   lista (que não anima), nunca medindo os itens durante a animação — medir no meio da animação
 *   fazia o destino "pular". O item começa no lugar dele e anda junto com o dedo;
 * - perto das bordas da tela, a página rola sozinha.
 * Toque: o listener `touchmove` não passivo bloqueia a rolagem só enquanto arrasta.
 */

const HOLD_MS = 450;
/** Movimento que cancela o "segurar" (é rolagem). */
const MOVE_TOLERANCE = 8;
/** Faixa perto da borda que rola a página e a velocidade máxima (px por quadro). */
const EDGE = 96;
const MAX_SCROLL = 14;

interface DragState {
  id: string;
  startIndex: number;
  index: number;
  /** Deslocamento visual do item arrastado em relação ao lugar dele na lista. */
  offset: number;
}

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // ignorar
  }
}

export function useHoldReorder<T extends { id: string }>({
  items,
  itemPx,
  gapPx,
  listRef,
  disabled = false,
  onCommit,
}: {
  items: readonly T[];
  /** Altura do item compacto e espaço entre itens (o "slot" = item + espaço). */
  itemPx: number;
  gapPx: number;
  /** Contêiner da lista (não pode ter transform): referência do topo. */
  listRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  /** Nova ordem ao soltar (só quando mudou). */
  onCommit: (ordered: T[]) => void;
}) {
  const [active, setActive] = useState(false);
  const [drag, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const setDrag = useCallback((d: DragState | null) => {
    dragRef.current = d;
    setDragState(d);
  }, []);
  const hold = useRef<{ id: string; x: number; y: number; timer: number } | null>(null);
  /** O toque que ligou o modo não vira clique (não abre/fecha o card). */
  const swallowClick = useRef(false);
  /** anchor: distância do dedo ao centro do lugar inicial do item (medida no 1º quadro do arraste). */
  const live = useRef<{ clientY: number; raf: number; anchor: number | null } | null>(null);
  const itemsRef = useRef(items);
  const commitRef = useRef(onCommit);
  useEffect(() => {
    itemsRef.current = items;
    commitRef.current = onCommit;
  });

  const cancelHold = () => {
    if (hold.current) window.clearTimeout(hold.current.timer);
    hold.current = null;
  };

  const update = useCallback(
    (clientY: number) => {
      const l = live.current;
      if (!l) return;
      l.clientY = clientY;
      const d = dragRef.current;
      const list = listRef.current;
      if (!d || !list) return;
      const slot = itemPx + gapPx;
      const top = list.getBoundingClientRect().top;
      // Ao entrar no modo a lista encolhe: o item começa no lugar dele e só o movimento do dedo conta.
      l.anchor ??= clientY - (top + d.startIndex * slot + itemPx / 2);
      const y = clientY - l.anchor;
      const index = Math.max(0, Math.min(itemsRef.current.length - 1, Math.floor((y - top + gapPx / 2) / slot)));
      if (index !== d.index) vibrate(6);
      setDrag({ ...d, index, offset: y - (top + index * slot + itemPx / 2) });
    },
    [itemPx, gapPx, listRef, setDrag],
  );

  /** Fim do gesto: `save` grava a nova ordem (se mudou); sempre sai do modo. */
  const finish = useCallback((save: boolean) => {
    const l = live.current;
    if (l) cancelAnimationFrame(l.raf);
    live.current = null;
    // O clique que vem logo depois de soltar ainda é do mesmo gesto; depois disso, cliques valem.
    window.setTimeout(() => (swallowClick.current = false), 80);
    const d = dragRef.current;
    setDrag(null);
    if (save && d && d.index !== d.startIndex) commitRef.current(moveItem(itemsRef.current, d.startIndex, d.index));
    // Soltar já grava e encerra o modo (os cards voltam ao normal).
    setActive(false);
  }, [setDrag]);

  const startDrag = useCallback(
    (id: string, clientY: number) => {
      const startIndex = itemsRef.current.findIndex((i) => i.id === id);
      if (startIndex < 0) return;
      // Remove seleção anterior antes de compactar o card: o navegador não deve arrastar texto.
      window.getSelection()?.removeAllRanges();
      live.current = { clientY, raf: 0, anchor: null };
      setDrag({ id, startIndex, index: startIndex, offset: 0 });
      // Primeira posição depois que a lista compacta aparecer.
      requestAnimationFrame(() => update(clientY));
      // Rola a página perto das bordas enquanto o dedo estiver lá.
      const tick = () => {
        const l = live.current;
        if (!l) return;
        // Pela posição do item arrastado (não do dedo): segurar perto da borda não rola sozinho.
        const h = window.innerHeight;
        const y = l.anchor === null ? h / 2 : l.clientY - l.anchor;
        const speed =
          y < EDGE ? -MAX_SCROLL * (1 - Math.max(0, y) / EDGE) : y > h - EDGE ? MAX_SCROLL * (1 - Math.max(0, h - y) / EDGE) : 0;
        if (speed) {
          window.scrollBy(0, speed);
          update(l.clientY);
        }
        l.raf = requestAnimationFrame(tick);
      };
      live.current.raf = requestAnimationFrame(tick);
    },
    [update, setDrag],
  );

  // Durante o arraste: segue o dedo pela janela (o gesto começou no "segurar", antes do modo)
  // e bloqueia a rolagem do toque.
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    const move = (e: globalThis.PointerEvent) => update(e.clientY);
    const up = (e: globalThis.PointerEvent) => {
      update(e.clientY);
      finish(true);
    };
    const cancel = () => finish(false);
    const block = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    // O card aberto encolhe durante o gesto; o ponteiro pode ficar sobre outro texto da tela.
    const blockText = (e: Event) => e.preventDefault();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("selectstart", blockText);
    window.addEventListener("dragstart", blockText);
    window.addEventListener("contextmenu", blockText);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", block);
      window.removeEventListener("selectstart", blockText);
      window.removeEventListener("dragstart", blockText);
      window.removeEventListener("contextmenu", blockText);
    };
  }, [dragging, update, finish]);

  useEffect(() => () => cancelHold(), []);

  /** Sai do modo sem mudar a ordem. */
  const exit = useCallback(() => {
    cancelHold();
    finish(false);
  }, [finish]);

  // Esc cancela.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, exit]);

  const order = drag ? moveItem(items, drag.startIndex, drag.index) : [...items];

  return {
    /** Modo de reordenar ligado (cards compactos balançando). */
    active,
    exit,
    order,
    draggingId: drag?.id ?? null,
    /** Deslocamento visual do item arrastado (o resto da distância já é a nova posição na lista). */
    dragOffset: drag?.offset ?? 0,

    /** Fora do modo: segurar liga o modo e começa a arrastar este item. */
    holdProps: (id: string) => ({
      onPointerDown: (e: PointerEvent<HTMLElement>) => {
        if (disabled || active || e.button !== 0) return;
        // No mouse, evita que segurar inicie seleção/arraste nativo. Toque continua podendo rolar.
        if (e.pointerType === "mouse") e.preventDefault();
        cancelHold();
        const { clientX: x, clientY: y } = e;
        hold.current = {
          id,
          x,
          y,
          timer: window.setTimeout(() => {
            hold.current = null;
            swallowClick.current = true;
            vibrate(15);
            setActive(true);
            startDrag(id, y);
          }, HOLD_MS),
        };
      },
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const h = hold.current;
        if (h && Math.hypot(e.clientX - h.x, e.clientY - h.y) > MOVE_TOLERANCE) cancelHold();
      },
      onPointerUp: cancelHold,
      onPointerCancel: cancelHold,
      onClickCapture: (e: MouseEvent<HTMLElement>) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.preventDefault();
        e.stopPropagation();
      },
      // Segurar no celular não abre menu de contexto/seleção de texto.
      onContextMenu: (e: MouseEvent<HTMLElement>) => e.preventDefault(),
    }),
  };
}
