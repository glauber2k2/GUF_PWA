"use client";

import { enterListOnArrowDown, listItemProps } from "@/shared/helpers/list-navigation";
import { listNavigationHint, shortcutHint, SHORTCUTS, type KeyboardHint } from "@/shared/helpers/shortcuts";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/shared/hooks/use-keyboard-shortcuts";
import { useListShortcuts } from "@/shared/hooks/use-list-shortcuts";

const PEOPLE_LIST = "people";

/** Espalhar na linha da pessoa (tabela e lista estreita ao lado do detalhe). */
export function personRowProps(userId: string) {
  return listItemProps(PEOPLE_LIST, userId);
}

/** ↓ na busca entra nos resultados. */
export const peopleSearchKeyDown = enterListOnArrowDown(PEOPLE_LIST);

interface PeopleShortcutActions {
  onOpen: (userId: string) => void;
  /** Sem permissão de ação em lote, X não marca. */
  onToggle?: (userId: string) => void;
  /** Só com uma conta aberta. */
  onCloseDetail?: () => void;
  onChangePlan?: () => void;
  onEditHandle?: () => void;
}

/** Atalhos de Pessoas: lista (↑/↓, Enter, X) e, com a conta aberta, Esc, P e E. */
export function usePeopleShortcuts(actions: PeopleShortcutActions, enabled: boolean): readonly KeyboardHint[] {
  const detailShortcuts: KeyboardShortcut[] = [];
  const hints: KeyboardHint[] = [listNavigationHint(), shortcutHint("open", "abrir a conta")];
  if (actions.onToggle) hints.push(shortcutHint("toggle", "marcar para ação em lote"));
  if (actions.onCloseDetail) {
    detailShortcuts.push({ keys: SHORTCUTS.close.keys, onTrigger: actions.onCloseDetail });
    hints.push(shortcutHint("close", "fechar a conta aberta"));
  }
  if (actions.onChangePlan) {
    detailShortcuts.push({ keys: SHORTCUTS.changePlan.keys, onTrigger: actions.onChangePlan });
    hints.push(shortcutHint("changePlan"));
  }
  if (actions.onEditHandle) {
    detailShortcuts.push({ keys: SHORTCUTS.edit.keys, onTrigger: actions.onEditHandle });
    hints.push(shortcutHint("edit", "editar o @ da conta aberta"));
  }

  useListShortcuts(PEOPLE_LIST, { onOpen: actions.onOpen, onToggle: actions.onToggle }, enabled);
  useKeyboardShortcuts(detailShortcuts, enabled);
  return hints;
}
