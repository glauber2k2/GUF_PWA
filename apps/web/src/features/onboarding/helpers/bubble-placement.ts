import type { TargetRect } from "@/features/onboarding/hooks/use-target-rect";

export interface BubblePlacement {
  top: number;
  left: number;
  /** Lado do alvo em que o balão fica (null = centralizado, sem seta). */
  side: "above" | "below" | null;
  /** Posição horizontal da seta dentro do balão (px a partir da esquerda). */
  arrowX: number;
}

interface Size {
  width: number;
  height: number;
}

/** Distância mínima das bordas da tela. */
const SCREEN_MARGIN_PX = 12;
/** Espaço entre o destaque e o balão (a seta ocupa parte dele). */
const TARGET_GAP_PX = 14;
/** A seta não encosta nas pontas arredondadas do balão. */
const ARROW_EDGE_PX = 24;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * Onde o balão fica: abaixo do alvo se couber, senão acima, senão do lado com mais espaço (preso
 * dentro da tela). Na horizontal, centralizado no alvo sem sair da tela; a seta aponta para o
 * centro do alvo. Sem alvo, no centro da tela.
 */
export function placeBubble(target: TargetRect | null, bubble: Size, viewport: Size): BubblePlacement {
  if (!target) {
    return {
      top: Math.max(SCREEN_MARGIN_PX, (viewport.height - bubble.height) / 2),
      left: Math.max(SCREEN_MARGIN_PX, (viewport.width - bubble.width) / 2),
      side: null,
      arrowX: bubble.width / 2,
    };
  }

  const targetBottom = target.top + target.height;
  const spaceBelow = viewport.height - targetBottom - TARGET_GAP_PX - SCREEN_MARGIN_PX;
  const spaceAbove = target.top - TARGET_GAP_PX - SCREEN_MARGIN_PX;
  const fitsBelow = spaceBelow >= bubble.height;
  const fitsAbove = spaceAbove >= bubble.height;
  const side = fitsBelow ? "below" : fitsAbove ? "above" : spaceBelow >= spaceAbove ? "below" : "above";

  const idealTop = side === "below" ? targetBottom + TARGET_GAP_PX : target.top - TARGET_GAP_PX - bubble.height;
  const top = clamp(idealTop, SCREEN_MARGIN_PX, viewport.height - bubble.height - SCREEN_MARGIN_PX);

  const targetCenterX = target.left + target.width / 2;
  const left = clamp(targetCenterX - bubble.width / 2, SCREEN_MARGIN_PX, viewport.width - bubble.width - SCREEN_MARGIN_PX);
  const arrowX = clamp(targetCenterX - left, ARROW_EDGE_PX, bubble.width - ARROW_EDGE_PX);

  return { top, left, side, arrowX };
}
