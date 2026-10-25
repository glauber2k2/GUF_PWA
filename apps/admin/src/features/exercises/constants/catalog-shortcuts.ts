import type { KeyboardHint } from "@/shared/components/keyboard-hints";

/** Legenda dos atalhos do catálogo (as teclas em si ficam em useCatalogShortcuts). */
export const CATALOG_SHORTCUT_HINTS: readonly KeyboardHint[] = [
  { keys: ["N"], label: "novo exercício" },
  { keys: ["I"], label: "importar" },
  { keys: ["↑", "↓"], label: "navegar" },
  { keys: ["E"], label: "editar" },
  { keys: ["Del"], label: "excluir" },
];
