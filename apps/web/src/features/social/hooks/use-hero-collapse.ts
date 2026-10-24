"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent } from "react";

/** Rolagem em que a foto termina de encolher. */
const COLLAPSE_SCROLL_PX = 160;
/** Espera ao sair de um campo: pular de um campo para outro não abre e fecha a foto. */
const BLUR_GRACE_MS = 120;

/**
 * Quanto a área da foto está recolhida (0 = aberta, 1 = recolhida): pela rolagem da página ou
 * por um campo do formulário em foco (o teclado ocupa a tela). Os handlers vão no <form>.
 */
export function useHeroCollapse() {
  const [scrollY, setScrollY] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const blurTimer = useRef<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (blurTimer.current) window.clearTimeout(blurTimer.current);
    };
  }, []);

  const onFocus = useCallback(() => {
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    setIsEditing(true);
  }, []);

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    const form = event.currentTarget;
    if (blurTimer.current) window.clearTimeout(blurTimer.current);
    blurTimer.current = window.setTimeout(() => {
      if (!form.contains(document.activeElement)) setIsEditing(false);
    }, BLUR_GRACE_MS);
  }, []);

  const progress = Math.min(1, Math.max(isEditing ? 1 : 0, scrollY / COLLAPSE_SCROLL_PX));
  return { progress, isScrolled: scrollY > 4, formHandlers: { onFocus, onBlur }, stopEditing: () => setIsEditing(false) };
}
