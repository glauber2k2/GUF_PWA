"use client";

import { useEffect, type RefObject } from "react";
import { advanceFromField, focusInitial } from "@/shared/helpers/form-focus";

/** Por quanto tempo o foco inicial acompanha campos que aparecem depois de abrir. */
const LATE_FIELDS_WINDOW_MS = 1500;

interface FormKeyboardOptions {
  /** Ao mudar (ex.: passo do formulário), o foco volta para o primeiro campo. */
  focusKey?: string | number;
  enabled?: boolean;
}

/** Enter num texto de várias linhas é quebra de linha: lá, Ctrl/Cmd + Enter avança. */
function wantsAdvance(event: KeyboardEvent, target: HTMLElement): boolean {
  if (event.key !== "Enter" || event.isComposing || event.altKey || event.shiftKey) return false;
  if (target.tagName === "TEXTAREA") return event.ctrlKey || event.metaKey;
  return !event.ctrlKey && !event.metaKey;
}

/**
 * Formulário todo pelo teclado: ao abrir (e a cada `focusKey`), foco no primeiro campo; Enter vai ao
 * próximo campo e, no último, aciona o botão principal. Botões continuam com o Enter deles.
 */
export function useFormKeyboard(containerRef: RefObject<HTMLElement | null>, { focusKey, enabled = true }: FormKeyboardOptions = {}) {
  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    let autoFocused: Element | null = null;
    const focusStart = () => {
      focusInitial(container);
      autoFocused = document.activeElement;
    };
    // Campos que chegam depois (ex.: a lista de planos vem do servidor): enquanto a pessoa não mexeu
    // no foco, ele acompanha o primeiro campo.
    const observer = new MutationObserver(() => {
      if (document.activeElement === autoFocused) focusStart();
    });
    // Depois da pintura: o conteúdo do passo novo já está na página.
    const frame = requestAnimationFrame(() => {
      focusStart();
      observer.observe(container, { childList: true, subtree: true });
    });
    const stopFollowing = setTimeout(() => observer.disconnect(), LATE_FIELDS_WINDOW_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(stopFollowing);
      observer.disconnect();
    };
  }, [containerRef, focusKey, enabled]);

  useEffect(() => {
    const container = containerRef.current;
    if (!enabled || !container) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !wantsAdvance(event, target)) return;
      if (advanceFromField(container, target)) event.preventDefault();
    };
    container.addEventListener("keydown", onKey);
    return () => container.removeEventListener("keydown", onKey);
  }, [containerRef, enabled]);
}
