"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/shared/helpers/motion";
import { TOUR_TARGET_FINDERS, type TourTargetId } from "@/features/onboarding/constants/tour-targets";

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Espaço entre o elemento e a borda do recorte. */
const TARGET_PADDING_PX = 8;
/** Depois de trocar de rota, a tela pode demorar a montar o elemento (dados carregando). */
const FIND_TIMEOUT_MS = 2000;
/**
 * Conferência da posição: o elemento pode mudar de lugar sem mudar de tamanho nem rolar
 * (conteúdo acima terminou de carregar, animação de entrada), o que nenhum evento avisa.
 */
const RECHECK_MS = 300;

function isSameRect(a: TargetRect, b: TargetRect): boolean {
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
}

/** Retângulo que cobre todos os elementos do alvo, com folga. */
function measure(elements: Element[]): TargetRect {
  const boxes = elements.map((element) => element.getBoundingClientRect());
  const top = Math.min(...boxes.map((box) => box.top));
  const left = Math.min(...boxes.map((box) => box.left));
  const bottom = Math.max(...boxes.map((box) => box.bottom));
  const right = Math.max(...boxes.map((box) => box.right));
  return {
    top: top - TARGET_PADDING_PX,
    left: left - TARGET_PADDING_PX,
    width: right - left + TARGET_PADDING_PX * 2,
    height: bottom - top + TARGET_PADDING_PX * 2,
  };
}

/** Primeiro alvo da lista que existe na tela (alternativas em ordem). */
function findElements(targets: readonly TourTargetId[]): Element[] | null {
  for (const target of targets) {
    const found = TOUR_TARGET_FINDERS[target]();
    if (Array.isArray(found)) {
      if (found.length > 0) return found;
    } else if (found) {
      return [found];
    }
  }
  return null;
}

/**
 * Posição na tela do alvo do passo, com folga, atualizada ao rolar, ao redimensionar, quando o
 * elemento muda de tamanho e numa conferência leve a cada 300 ms. Procura por até 2 s (a tela pode
 * estar carregando); sem alvo, ou não encontrado, devolve null e o balão fica no centro.
 * @param stepId muda a cada passo (o rect de um passo não vale para o seguinte)
 */
export function useTargetRect(stepId: string, target: TourTargetId | readonly TourTargetId[] | undefined): TargetRect | null {
  const [found, setFound] = useState<{ stepId: string; rect: TargetRect } | null>(null);
  const targets: readonly TourTargetId[] = target === undefined ? [] : typeof target === "string" ? [target] : target;
  // Texto estável para o efeito (a lista pode ser recriada a cada renderização).
  const targetKey = targets.join(",");

  useEffect(() => {
    if (!targetKey) return;
    const ids = targetKey.split(",") as TourTargetId[];
    const startedAt = performance.now();
    let frame = 0;
    let elements: Element[] | null = null;
    const observer = new ResizeObserver(() => update());

    function update() {
      if (!elements) return;
      const rect = measure(elements);
      setFound((current) => (current && current.stepId === stepId && isSameRect(current.rect, rect) ? current : { stepId, rect }));
    }

    function find() {
      elements = findElements(ids);
      if (!elements) {
        if (performance.now() - startedAt < FIND_TIMEOUT_MS) frame = requestAnimationFrame(find);
        return;
      }
      elements[0]?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      elements.forEach((element) => observer.observe(element));
      update();
    }

    frame = requestAnimationFrame(find);
    const recheck = setInterval(update, RECHECK_MS);
    // capture: a rolagem pode ser de qualquer contêiner (inclusive o da demonstração do treino).
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(recheck);
      observer.disconnect();
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [stepId, targetKey]);

  // O alvo do passo anterior não vale para o atual.
  return targetKey && found?.stepId === stepId ? found.rect : null;
}
