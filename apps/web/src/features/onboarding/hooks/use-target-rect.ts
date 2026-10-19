"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/shared/helpers/motion";

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

function measure(element: Element): TargetRect {
  const box = element.getBoundingClientRect();
  return {
    top: box.top - TARGET_PADDING_PX,
    left: box.left - TARGET_PADDING_PX,
    width: box.width + TARGET_PADDING_PX * 2,
    height: box.height + TARGET_PADDING_PX * 2,
  };
}

/**
 * Posição na tela do elemento `[data-tour="<target>"]`, com folga, atualizada ao rolar, ao
 * redimensionar, quando o elemento muda de tamanho e numa conferência leve a cada 300 ms.
 * Procura por até 2 s; sem alvo (ou não
 * encontrado) devolve null e o tour mostra o card sem recorte.
 */
export function useTargetRect(target: string | undefined): TargetRect | null {
  const [found, setFound] = useState<{ target: string; rect: TargetRect } | null>(null);

  useEffect(() => {
    if (!target) return;
    const startedAt = performance.now();
    let frame = 0;
    let element: Element | null = null;
    const observer = new ResizeObserver(() => update());

    function update() {
      if (!element) return;
      const rect = measure(element);
      setFound((current) => (current && current.target === target && isSameRect(current.rect, rect) ? current : { target: target as string, rect }));
    }

    function find() {
      element = document.querySelector(`[data-tour="${target}"]`);
      if (!element) {
        if (performance.now() - startedAt < FIND_TIMEOUT_MS) frame = requestAnimationFrame(find);
        return;
      }
      element.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      observer.observe(element);
      update();
    }

    frame = requestAnimationFrame(find);
    const recheck = setInterval(update, RECHECK_MS);
    // capture: a rolagem pode ser de qualquer contêiner, não só da janela.
    window.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(recheck);
      observer.disconnect();
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [target]);

  // O alvo do passo anterior não vale para o atual.
  return target && found?.target === target ? found.rect : null;
}
