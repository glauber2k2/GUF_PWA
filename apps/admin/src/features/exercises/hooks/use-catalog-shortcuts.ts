"use client";

import { useKeyboardShortcuts, type KeyboardShortcut } from "@/shared/hooks/use-keyboard-shortcuts";

const ROW_ATTRIBUTE = "data-catalog-exercise";

/** Espalhar na linha do exercício: ela recebe foco (Tab ou ↑/↓) e os atalhos agem sobre ela. */
export function catalogRowProps(id: string) {
  return { [ROW_ATTRIBUTE]: id, tabIndex: 0 } as const;
}

/** Linha em foco (a própria linha, não um botão dentro dela: Enter no menu continua sendo do menu). */
function focusedRow(): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement && active.hasAttribute(ROW_ATTRIBUTE) ? active : null;
}

function moveRowFocus(step: 1 | -1): boolean {
  const current = focusedRow();
  if (!current) return false;
  const rows = [...document.querySelectorAll<HTMLElement>(`[${ROW_ATTRIBUTE}]`)];
  rows[rows.indexOf(current) + step]?.focus();
  return true;
}

function withFocusedRow(action: (id: string) => void): () => boolean {
  return () => {
    const id = focusedRow()?.getAttribute(ROW_ATTRIBUTE);
    if (!id) return false;
    action(id);
    return true;
  };
}

interface CatalogShortcutActions {
  onNew: () => void;
  onImport: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Teclado no catálogo (só para quem pode cadastrar, no computador): N novo · I importar ·
 * ↑/↓ entre as linhas · E ou Enter edita · Del ou Backspace exclui a linha em foco.
 */
export function useCatalogShortcuts({ onNew, onImport, onEdit, onDelete }: CatalogShortcutActions, enabled: boolean) {
  const shortcuts: KeyboardShortcut[] = [
    { keys: ["n"], onTrigger: onNew },
    { keys: ["i"], onTrigger: onImport },
    { keys: ["ArrowDown"], onTrigger: () => moveRowFocus(1) },
    { keys: ["ArrowUp"], onTrigger: () => moveRowFocus(-1) },
    { keys: ["e", "Enter"], onTrigger: withFocusedRow(onEdit) },
    { keys: ["Delete", "Backspace"], onTrigger: withFocusedRow(onDelete) },
  ];
  useKeyboardShortcuts(shortcuts, enabled);
}
