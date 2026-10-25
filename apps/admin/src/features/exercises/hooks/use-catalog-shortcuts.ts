"use client";

import { focusFieldById } from "@/shared/helpers/form-focus";
import { enterListOnArrowDown, listItemProps } from "@/shared/helpers/list-navigation";
import { SHORTCUTS } from "@/shared/helpers/shortcuts";
import { useKeyboardShortcuts } from "@/shared/hooks/use-keyboard-shortcuts";
import { useListShortcuts } from "@/shared/hooks/use-list-shortcuts";

const CATALOG_LIST = "catalog-exercises";
export const CATALOG_SEARCH_INPUT_ID = "busca-exercicio";

/** Espalhar na linha do exercício: ela recebe foco (Tab ou ↑/↓) e os atalhos agem sobre ela. */
export function catalogRowProps(id: string) {
  return listItemProps(CATALOG_LIST, id);
}

/** ↓ na busca entra na lista de exercícios. */
export const catalogSearchKeyDown = enterListOnArrowDown(CATALOG_LIST);

interface CatalogShortcutActions {
  onNew: () => void;
  onImport: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Teclado no catálogo (só para quem pode cadastrar, no computador): N novo · I importar · F busca ·
 * ↑/↓ entre as linhas · Enter ou E edita · Del exclui a linha em foco. Legenda: CATALOG_SHORTCUT_HINTS.
 */
export function useCatalogShortcuts({ onNew, onImport, onEdit, onDelete }: CatalogShortcutActions, enabled: boolean) {
  useKeyboardShortcuts(
    [
      { keys: SHORTCUTS.create.keys, onTrigger: onNew },
      { keys: SHORTCUTS.importFile.keys, onTrigger: onImport },
      { keys: SHORTCUTS.filter.keys, onTrigger: () => focusFieldById(CATALOG_SEARCH_INPUT_ID) },
    ],
    enabled,
  );
  useListShortcuts(CATALOG_LIST, { onOpen: onEdit, onEdit, onRemove: onDelete }, enabled);
}
