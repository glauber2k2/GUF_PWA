"use client";

import { useEffect, useRef } from "react";

export interface KeyboardShortcut {
  /** Valores de `KeyboardEvent.key` que disparam (ex.: ["Delete", "Backspace"]). Letras sem diferenciar maiúscula. */
  keys: readonly string[];
  /** Devolver `false` = não era para este atalho (a tecla segue o comportamento normal, ex.: rolar). */
  onTrigger: (event: KeyboardEvent) => boolean | void;
}

const TYPING_TAGS = /^(INPUT|TEXTAREA|SELECT)$/;

/** Digitando num campo, os atalhos de uma tecla ficam desligados (a tecla é do texto). */
function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (TYPING_TAGS.test(target.tagName) || target.isContentEditable);
}

/** Com um diálogo aberto, as teclas são dele (Esc, Tab), não da página de trás. */
function isDialogOpen(): boolean {
  return document.querySelector('[aria-modal="true"]') !== null;
}

function matches(shortcut: KeyboardShortcut, key: string): boolean {
  return shortcut.keys.some((k) => k.toLowerCase() === key.toLowerCase());
}

/**
 * Atalhos de teclado do painel (uma tecla, sem Ctrl/Cmd/Alt). Fora de campos de texto e de diálogos.
 * A lista pode mudar a cada render: o hook usa sempre a mais recente sem religar o ouvinte.
 */
export function useKeyboardShortcuts(shortcuts: readonly KeyboardShortcut[], enabled = true) {
  const latest = useRef(shortcuts);

  useEffect(() => {
    latest.current = shortcuts;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      if (isTyping(event.target) || isDialogOpen()) return;
      const shortcut = latest.current.find((s) => matches(s, event.key));
      if (!shortcut) return;
      if (shortcut.onTrigger(event) !== false) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
