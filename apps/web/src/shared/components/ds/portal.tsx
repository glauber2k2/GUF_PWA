"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

/**
 * Renderiza no <body>, fora da árvore da tela. Camadas fixas na tela (folhas, diálogos, seletores)
 * precisam disso: um ancestral com `transform` (ex.: animação de entrada animate-guf-rise) vira a
 * referência do `position: fixed` e a camada "escondida" aparece no meio da página.
 * No HTML estático (pré-render) não há <body> do navegador: não renderiza nada até hidratar.
 */
export function ScreenPortal({ children }: { children: ReactNode }) {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return isClient ? createPortal(children, document.body) : null;
}
