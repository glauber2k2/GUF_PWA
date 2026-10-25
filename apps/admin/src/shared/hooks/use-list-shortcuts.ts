"use client";

import { focusedListItemId, moveListFocus } from "@/shared/helpers/list-navigation";
import { SHORTCUTS } from "@/shared/helpers/shortcuts";
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/shared/hooks/use-keyboard-shortcuts";

/** Ações sobre o item em foco; só as informadas viram atalho (cada lista oferece o que faz sentido). */
export interface ListItemActions {
  onOpen?: (id: string) => void;
  onEdit?: (id: string) => void;
  onRemove?: (id: string) => void;
  onToggle?: (id: string) => void;
}

function onFocusedItem(list: string, action: (id: string) => void): () => boolean {
  return () => {
    const id = focusedListItemId(list);
    if (!id) return false;
    action(id);
    return true;
  };
}

/**
 * Teclado numa lista do painel: ↑/↓ entre os itens e, no item em foco, Enter abre, E edita, Del
 * exclui e X marca. Os itens precisam de `listItemProps(list, id)`.
 */
export function useListShortcuts(list: string, actions: ListItemActions, enabled = true) {
  const shortcuts: KeyboardShortcut[] = [
    { keys: SHORTCUTS.next.keys, onTrigger: () => moveListFocus(list, 1) },
    { keys: SHORTCUTS.previous.keys, onTrigger: () => moveListFocus(list, -1) },
  ];
  if (actions.onOpen) shortcuts.push({ keys: SHORTCUTS.open.keys, onTrigger: onFocusedItem(list, actions.onOpen) });
  if (actions.onEdit) shortcuts.push({ keys: SHORTCUTS.edit.keys, onTrigger: onFocusedItem(list, actions.onEdit) });
  if (actions.onRemove) shortcuts.push({ keys: SHORTCUTS.remove.keys, onTrigger: onFocusedItem(list, actions.onRemove) });
  if (actions.onToggle) shortcuts.push({ keys: SHORTCUTS.toggle.keys, onTrigger: onFocusedItem(list, actions.onToggle) });
  useKeyboardShortcuts(shortcuts, enabled);
}
