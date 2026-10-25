"use client";

import { useEffect, useState } from "react";
import { BOTTOM_BAR_SELECTOR } from "@/shared/components/ds";

/**
 * Marca de uma barra fixa no rodapé (menu inferior, mini card, "Salvar", descanso do treino, folhas
 * abertas…): o que flutua por cima da tela (a pilha de avisos) fica acima dela. Espalhar no elemento
 * da barra. O contrato mora no design system (as folhas do `BottomSheet` também se marcam).
 */
export { BOTTOM_BAR_PROPS } from "@/shared/components/ds";

/** Folga para arredondamento: barra escondida logo abaixo da tela (translate 100%) não conta. */
const HIDDEN_EDGE_PX = 1;
/** Mudanças que movem a barra sem mudar o tamanho dela (classe que troca o translate, arraste por estilo). */
const MOVING_ATTRIBUTES = ["class", "style"];
const MOTION_START_EVENTS = ["transitionrun", "animationstart"] as const;
const MOTION_END_EVENTS = ["transitionend", "transitioncancel", "animationend", "animationcancel"] as const;
/** Teto do acompanhamento quadro a quadro, caso o fim do movimento nunca chegue (aba em segundo plano, elemento trocado). */
const MAX_MOTION_MS = 1000;

/** Altura ocupada a partir do fundo da janela pela barra marcada mais alta e visível (px); 0 sem barra. */
function measureBottomClearance(): number {
  const viewportHeight = window.innerHeight;
  let clearance = 0;
  for (const bar of document.querySelectorAll<HTMLElement>(BOTTOM_BAR_SELECTOR)) {
    const rect = bar.getBoundingClientRect();
    // Barra escondida (fora da tela, recolhida ou sem tamanho) não ocupa o rodapé.
    if (rect.height === 0 || rect.top >= viewportHeight - HIDDEN_EDGE_PX) continue;
    clearance = Math.max(clearance, viewportHeight - rect.top);
  }
  return Math.round(clearance);
}

function isBottomBar(target: EventTarget | null): target is Element {
  return target instanceof Element && target.matches(BOTTOM_BAR_SELECTOR);
}

/**
 * Espaço ocupado pelas barras fixas do rodapé (marcadas com `BOTTOM_BAR_PROPS`), medido na tela.
 * Enquanto uma barra desliza (transição ou animação), a medida é refeita a cada quadro: quem usa o
 * valor acompanha o movimento (ex.: a pilha de avisos sobe junto com a folha e desce quando ela fecha).
 * Quem desenha a barra não precisa avisar ninguém.
 */
export function useBottomClearance(): number {
  const [clearance, setClearance] = useState(0);

  useEffect(() => {
    let frame = 0;
    // Barra em movimento → prazo de segurança para parar de acompanhar.
    const moving = new Map<Element, number>();
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setClearance(measureBottomClearance());
        // Segue medindo enquanto alguma barra está em movimento.
        if (moving.size > 0) measure();
      });
    };
    const stopTracking = (bar: Element) => {
      clearTimeout(moving.get(bar));
      moving.delete(bar);
      // Posição final na hora: não depende do próximo quadro (que pode atrasar com a aba em segundo plano).
      setClearance(measureBottomClearance());
    };
    const startTracking = (bar: Element) => {
      clearTimeout(moving.get(bar));
      moving.set(bar, window.setTimeout(() => stopTracking(bar), MAX_MOTION_MS));
      measure();
    };
    const startMotion = (event: Event) => {
      if (isBottomBar(event.target)) startTracking(event.target);
    };
    const endMotion = (event: Event) => {
      if (isBottomBar(event.target)) stopTracking(event.target);
    };

    const observed = new Set<Element>();
    const resizeObserver = new ResizeObserver(measure);
    // Classe ou estilo trocados (ex.: a folha abrindo, o arraste) começam o movimento: acompanha desde já.
    const attributeObserver = new MutationObserver((mutations) => mutations.forEach((mutation) => startTracking(mutation.target as Element)));
    // Observa só as barras novas e solta as que saíram da página (observar de novo dispararia o ResizeObserver à toa).
    const trackBars = () => {
      const bars = new Set(document.querySelectorAll(BOTTOM_BAR_SELECTOR));
      for (const bar of observed) {
        if (bars.has(bar)) continue;
        resizeObserver.unobserve(bar);
        observed.delete(bar);
        clearTimeout(moving.get(bar));
        moving.delete(bar);
      }
      for (const bar of bars) {
        if (observed.has(bar)) continue;
        resizeObserver.observe(bar);
        attributeObserver.observe(bar, { attributes: true, attributeFilter: MOVING_ATTRIBUTES });
        observed.add(bar);
      }
      measure();
    };
    const childObserver = new MutationObserver(trackBars);
    childObserver.observe(document.body, { childList: true, subtree: true });
    MOTION_START_EVENTS.forEach((type) => document.addEventListener(type, startMotion, true));
    MOTION_END_EVENTS.forEach((type) => document.addEventListener(type, endMotion, true));
    window.addEventListener("resize", measure);
    // Movimento que terminou com o app em segundo plano: confere ao voltar.
    document.addEventListener("visibilitychange", measure);
    trackBars();
    return () => {
      cancelAnimationFrame(frame);
      moving.forEach((timer) => clearTimeout(timer));
      moving.clear();
      resizeObserver.disconnect();
      attributeObserver.disconnect();
      childObserver.disconnect();
      MOTION_START_EVENTS.forEach((type) => document.removeEventListener(type, startMotion, true));
      MOTION_END_EVENTS.forEach((type) => document.removeEventListener(type, endMotion, true));
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", measure);
    };
  }, []);

  return clearance;
}
