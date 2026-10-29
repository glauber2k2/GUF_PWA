"use client";

import { useEffect, useRef, useState } from "react";

/** Parte do elemento que precisa aparecer para contar como "entrou na tela". */
const DEFAULT_VISIBLE_SHARE = 0.35;

/**
 * Avisa uma única vez quando o elemento entra na tela (ex.: animar só quando a pessoa rola até ele).
 * Depois de visto, para de observar. Com `isEnabled` false, não observa nada (custo zero).
 * @param isEnabled observar este elemento
 * @param visibleShare fração visível que conta como entrar na tela
 * @returns o ref do elemento e se ele já entrou na tela
 */
export function useInViewOnce<T extends Element>(isEnabled: boolean, visibleShare = DEFAULT_VISIBLE_SHARE) {
  const ref = useRef<T>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!isEnabled || hasEntered || !element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setHasEntered(true);
        observer.disconnect();
      },
      { threshold: visibleShare },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isEnabled, hasEntered, visibleShare]);

  return { ref, hasEntered };
}
