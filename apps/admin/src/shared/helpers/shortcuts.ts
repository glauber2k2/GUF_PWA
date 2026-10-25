/**
 * Vocabulário de atalhos do painel: a mesma tecla faz a mesma coisa em todas as telas.
 * Fonte única das teclas (o que o hook escuta) e de como elas aparecem (legendas e a ajuda "?").
 * Tela nova = escolher daqui; tecla nova só se nenhuma destas servir.
 */

/** Uma linha de legenda: teclas como aparecem e o que fazem. */
export interface KeyboardHint {
  keys: readonly string[];
  label: string;
}

export interface ShortcutDefinition {
  /** Valores de `KeyboardEvent.key` (letras sem diferenciar maiúscula). */
  keys: readonly string[];
  /** Como a tecla aparece na tela. */
  display: readonly string[];
  /** Texto padrão da ação (cada tela pode trocar, ex.: "novo exercício"). */
  label: string;
}

export const SHORTCUTS = {
  help: { keys: ["?"], display: ["?"], label: "ver os atalhos" },
  search: { keys: ["/"], display: ["/"], label: "buscar pessoa" },
  goTo: { keys: ["1", "2", "3", "4", "5", "6", "7", "8", "9"], display: ["1", "…", "9"], label: "ir para a área do menu" },
  create: { keys: ["n"], display: ["N"], label: "criar novo" },
  importFile: { keys: ["i"], display: ["I"], label: "importar arquivo" },
  filter: { keys: ["f"], display: ["F"], label: "ir para a busca e os filtros" },
  next: { keys: ["ArrowDown"], display: ["↓"], label: "próximo da lista" },
  previous: { keys: ["ArrowUp"], display: ["↑"], label: "anterior da lista" },
  open: { keys: ["Enter"], display: ["Enter"], label: "abrir o item em foco" },
  edit: { keys: ["e"], display: ["E"], label: "editar o item em foco" },
  remove: { keys: ["Delete", "Backspace"], display: ["Del"], label: "excluir o item em foco" },
  toggle: { keys: ["x"], display: ["X"], label: "marcar ou desmarcar o item em foco" },
  changePlan: { keys: ["p"], display: ["P"], label: "mudar o plano da conta aberta" },
  close: { keys: ["Escape"], display: ["Esc"], label: "fechar" },
} as const satisfies Record<string, ShortcutDefinition>;

export type ShortcutName = keyof typeof SHORTCUTS;

/** Legenda de um atalho do vocabulário, com o texto da tela quando ele for mais claro. */
export function shortcutHint(name: ShortcutName, label?: string): KeyboardHint {
  const shortcut = SHORTCUTS[name];
  return { keys: shortcut.display, label: label ?? shortcut.label };
}

/** ↑ ↓ numa legenda só. */
export function listNavigationHint(): KeyboardHint {
  return { keys: [...SHORTCUTS.previous.display, ...SHORTCUTS.next.display], label: "andar pela lista" };
}

/** Atalhos que valem em qualquer tela (seção fixa da ajuda). */
export const GLOBAL_SHORTCUT_HINTS: readonly KeyboardHint[] = [
  shortcutHint("help"),
  shortcutHint("search"),
  shortcutHint("goTo"),
  shortcutHint("close", "fechar diálogo ou detalhe"),
];

/** Como os formulários respondem ao teclado (seção fixa da ajuda). */
export const FORM_SHORTCUT_HINTS: readonly KeyboardHint[] = [
  { keys: ["Enter"], label: "próximo campo; no último, confirma" },
  { keys: ["Ctrl", "Enter"], label: "avançar num texto de várias linhas" },
  { keys: ["Shift", "Tab"], label: "campo anterior" },
];
