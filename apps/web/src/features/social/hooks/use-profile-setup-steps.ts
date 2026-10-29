"use client";

import { useState } from "react";

/** Passos do cadastro, na ordem (o último é o resumo "Tudo pronto"). */
export const PROFILE_SETUP_STEPS = ["identity", "photo", "friends", "done"] as const;
export type ProfileSetupStep = (typeof PROFILE_SETUP_STEPS)[number];
/** Passos contados na barra de progresso ("1 de 3"): o resumo fica de fora. */
export const PROFILE_SETUP_COUNTED_STEPS = PROFILE_SETUP_STEPS.length - 1;

/**
 * Navegação do cadastro em passos: avançar, voltar e pular (o passo pulado aparece como "Depois"
 * no resumo; voltar e concluir tira a marca). A direção alimenta a animação de entrada.
 */
export function useProfileSetupSteps() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [skipped, setSkipped] = useState<ReadonlySet<ProfileSetupStep>>(new Set());
  const step = PROFILE_SETUP_STEPS[index]!;

  const goTo = (next: number, markSkipped: boolean) => {
    setSkipped((current) => {
      const updated = new Set(current);
      if (markSkipped) updated.add(step);
      else updated.delete(step);
      return updated;
    });
    setDirection(next > index ? "forward" : "back");
    setIndex(Math.max(0, Math.min(PROFILE_SETUP_STEPS.length - 1, next)));
  };

  return {
    step,
    index,
    direction,
    skipped,
    canGoBack: index > 0,
    next: () => goTo(index + 1, false),
    skip: () => goTo(index + 1, true),
    back: () => goTo(index - 1, false),
  };
}
