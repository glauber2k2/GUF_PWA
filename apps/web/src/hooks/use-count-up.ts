"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Conta de 0 até `target` (ease-out cúbico). Com movimento reduzido, mostra o valor final direto.
 * Celebração: 800ms (token --duration-celebrate).
 */
export function useCountUp(target: number, { durationMs = 800, delayMs = 420 } = {}): number {
  const [value, setValue] = useState<number | null>(() => (prefersReducedMotion() ? null : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const start = performance.now() + delayMs;
    const step = (now: number) => {
      const progress = Math.min(1, Math.max(0, (now - start) / durationMs));
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, delayMs]);

  return value ?? target;
}
