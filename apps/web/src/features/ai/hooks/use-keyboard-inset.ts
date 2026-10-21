"use client";

import { useEffect, useState } from "react";

/** Abaixo disso é a barra do navegador aparecendo ou sumindo, não o teclado. */
const MIN_KEYBOARD_PX = 80;

/** Altura que o teclado cobre na parte de baixo da tela (0 = fechado). */
function readKeyboardInset(): number {
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  const covered = window.innerHeight - viewport.height - viewport.offsetTop;
  return covered >= MIN_KEYBOARD_PX ? Math.round(covered) : 0;
}

/**
 * Espaço ocupado pelo teclado virtual. No Chrome (Android) e no Safari (iPhone) o teclado só
 * cobre a página (a área visível encolhe, o layout não): camadas fixas no rodapé ficam atrás dele.
 * Sem a API visualViewport, devolve sempre 0.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setInset(readKeyboardInset());
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
