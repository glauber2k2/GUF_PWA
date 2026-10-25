"use client";

import { useEffect, useState } from "react";

/**
 * Marca de uma barra fixa no rodapé (menu inferior, mini card, "Salvar", descanso do treino…): o que
 * flutua por cima da tela (a pilha de avisos) fica acima dela. Espalhar no elemento da barra.
 */
export const BOTTOM_BAR_PROPS = { "data-bottom-bar": "" } as const;

const BOTTOM_BAR_SELECTOR = "[data-bottom-bar]";

/** Altura ocupada a partir do fundo da janela pela barra marcada mais alta e visível (px); 0 sem barra. */
function measureBottomClearance(): number {
  const viewportHeight = window.innerHeight;
  let clearance = 0;
  for (const bar of document.querySelectorAll<HTMLElement>(BOTTOM_BAR_SELECTOR)) {
    const rect = bar.getBoundingClientRect();
    // Barra escondida (fora da tela, recolhida ou sem tamanho) não ocupa o rodapé.
    if (rect.height === 0 || rect.top >= viewportHeight) continue;
    clearance = Math.max(clearance, viewportHeight - rect.top);
  }
  return Math.round(clearance);
}

/**
 * Espaço ocupado pelas barras fixas do rodapé (marcadas com `BOTTOM_BAR_PROPS`), medido na tela e
 * atualizado quando elas entram, saem, mudam de tamanho ou terminam de deslizar. Quem desenha a barra
 * não precisa avisar ninguém.
 */
export function useBottomClearance(): number {
  const [clearance, setClearance] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setClearance(measureBottomClearance()));
    };
    const observed = new Set<Element>();
    const resizeObserver = new ResizeObserver(measure);
    // Observa só as barras novas e solta as que saíram da página (observar de novo dispararia o ResizeObserver à toa).
    const trackBars = () => {
      const bars = new Set(document.querySelectorAll(BOTTOM_BAR_SELECTOR));
      for (const bar of observed) {
        if (bars.has(bar)) continue;
        resizeObserver.unobserve(bar);
        observed.delete(bar);
      }
      for (const bar of bars) {
        if (observed.has(bar)) continue;
        resizeObserver.observe(bar);
        observed.add(bar);
      }
      measure();
    };
    const mutationObserver = new MutationObserver(trackBars);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    // Barras que entram ou saem deslizando (transform) não mudam de tamanho: mede quando o movimento termina.
    const motionEvents = ["transitionend", "animationend"] as const;
    motionEvents.forEach((type) => document.addEventListener(type, measure, true));
    window.addEventListener("resize", measure);
    trackBars();
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      motionEvents.forEach((type) => document.removeEventListener(type, measure, true));
      window.removeEventListener("resize", measure);
    };
  }, []);

  return clearance;
}
