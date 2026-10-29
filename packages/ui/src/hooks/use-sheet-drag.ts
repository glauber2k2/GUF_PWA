"use client";

import { useRef, useState, type PointerEvent } from "react";

/** Ao soltar, fecha se desceu esta fração da altura da folha… */
const CLOSE_FRACTION = 0.3;
/** …ou se o gesto terminou rápido para baixo (px/ms, "peteleco"). */
const CLOSE_VELOCITY = 0.5;

interface Sample {
  y: number;
  t: number;
}

/**
 * Arrastar a folha para baixo para fechar (pointer events: toque e mouse). A folha acompanha o dedo
 * (`offset` em px, `progress` 0–1 para clarear o fundo) e, ao soltar, chama `onClose` ou volta ao lugar.
 * Sem `onClose`, não faz nada.
 */
/** Elementos que respondem ao toque dentro da área de arraste. */
const INTERACTIVE_SELECTOR = "button, a, input, select, textarea";

export function useSheetDrag(onClose?: () => void) {
  const [moved, setMoved] = useState<{ offset: number; height: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; height: number; prev: Sample; last: Sample } | null>(null);

  const end = (close: boolean) => {
    drag.current = null;
    setMoved(null);
    if (close) onClose?.();
  };

  return {
    sheetRef,
    /** Distância arrastada em px; null fora do arraste (a folha volta a usar as transições). */
    offset: moved?.offset ?? null,
    progress: moved ? Math.min(1, moved.offset / moved.height) : 0,
    /** Props da área de arraste (alça + título). */
    dragProps: onClose
      ? {
          onPointerDown: (e: PointerEvent<HTMLElement>) => {
            if (e.button !== 0) return;
            // Toque num controle do cabeçalho (voltar, fechar) é clique, não arraste: a captura roubaria o clique.
            if ((e.target as Element).closest(INTERACTIVE_SELECTOR)) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            const sample = { y: e.clientY, t: e.timeStamp };
            const height = sheetRef.current?.offsetHeight || 1;
            drag.current = { startY: e.clientY, height, prev: sample, last: sample };
            setMoved({ offset: 0, height });
          },
          onPointerMove: (e: PointerEvent<HTMLElement>) => {
            const d = drag.current;
            if (!d) return;
            d.prev = d.last;
            d.last = { y: e.clientY, t: e.timeStamp };
            setMoved({ offset: Math.max(0, e.clientY - d.startY), height: d.height });
          },
          onPointerUp: (e: PointerEvent<HTMLElement>) => {
            const d = drag.current;
            if (!d) return;
            const distance = e.clientY - d.startY;
            const elapsed = d.last.t - d.prev.t;
            const velocity = elapsed > 0 ? (d.last.y - d.prev.y) / elapsed : 0;
            end(distance > d.height * CLOSE_FRACTION || (distance > 0 && velocity > CLOSE_VELOCITY));
          },
          onPointerCancel: () => end(false),
        }
      : {},
  };
}
