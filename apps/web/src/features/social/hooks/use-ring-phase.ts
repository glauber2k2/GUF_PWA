"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** idle = anel girando · fill = anel se desenhando (enviando) · done = pulso de confirmação. */
export type RingPhase = "idle" | "fill" | "done";

/** O anel leva 1,1 s para fechar: uma resposta mais rápida não corta a animação no meio. */
const FILL_MIN_MS = 1150;
const DONE_MS = 1400;
const DONE_VIBRATION_MS = 15;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fase do anel em volta da foto enquanto uma gravação acontece (foto enviada ou perfil salvo). */
export function useRingPhase() {
  const [phase, setPhase] = useState<RingPhase>("idle");
  const doneTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (doneTimer.current) window.clearTimeout(doneTimer.current);
    },
    [],
  );

  /** Roda a tarefa com o anel enchendo; sucesso → "done" por um instante; falha → volta e repassa o erro. */
  const run = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    if (doneTimer.current) window.clearTimeout(doneTimer.current);
    setPhase("fill");
    try {
      const [result] = await Promise.all([task(), delay(FILL_MIN_MS)]);
      setPhase("done");
      navigator.vibrate?.(DONE_VIBRATION_MS);
      doneTimer.current = window.setTimeout(() => setPhase("idle"), DONE_MS);
      return result;
    } catch (error) {
      setPhase("idle");
      throw error;
    }
  }, []);

  return { phase, run };
}
