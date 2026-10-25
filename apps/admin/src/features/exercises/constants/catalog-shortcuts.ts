import { listNavigationHint, shortcutHint, type KeyboardHint } from "@/shared/helpers/shortcuts";

/** Legenda dos atalhos do catálogo (as teclas em si ficam em useCatalogShortcuts). */
export const CATALOG_SHORTCUT_HINTS: readonly KeyboardHint[] = [
  shortcutHint("create", "novo exercício"),
  shortcutHint("importFile"),
  shortcutHint("filter", "buscar exercício"),
  listNavigationHint(),
  shortcutHint("edit", "editar"),
  shortcutHint("remove", "excluir"),
];
