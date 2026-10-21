"use client";

import { useEffect, useState } from "react";

/**
 * Frase que se alterna a cada `intervalMs`, para mostrar que algo está acontecendo.
 * Lista nova (ex.: a IA passou a buscar outro dado) recomeça da primeira frase.
 */
export function useRotatingPhrase(phrases: string[], intervalMs: number): string {
  const [state, setState] = useState({ phrases, index: 0 });
  if (state.phrases !== phrases) setState({ phrases, index: 0 });

  useEffect(() => {
    if (phrases.length < 2) return;
    const timer = setInterval(() => setState((current) => ({ ...current, index: (current.index + 1) % phrases.length })), intervalMs);
    return () => clearInterval(timer);
  }, [phrases, intervalMs]);

  return phrases[state.index % phrases.length] ?? "";
}
