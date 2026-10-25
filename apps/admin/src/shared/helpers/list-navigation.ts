/**
 * Foco por item nas listas do painel (linha da tabela ou cartão): ↑/↓ andam entre os itens e os
 * atalhos (Enter, E, Del, X) agem sobre o item em foco. Cada lista tem um nome próprio, então duas
 * listas na mesma tela não se misturam.
 */

const LIST_ATTRIBUTE = "data-list";
const ITEM_ATTRIBUTE = "data-list-item";

/** Espalhar no item: ele recebe foco (Tab ou setas) e passa a ser alvo dos atalhos da lista. */
export function listItemProps(list: string, id: string) {
  return { [LIST_ATTRIBUTE]: list, [ITEM_ATTRIBUTE]: id, tabIndex: 0 } as const;
}

function itemsOf(list: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`[${LIST_ATTRIBUTE}="${CSS.escape(list)}"][${ITEM_ATTRIBUTE}]`)];
}

/** Item em foco da lista: o próprio item, não um botão dentro dele (Enter no menu continua sendo do menu). */
function focusedItem(list: string): HTMLElement | null {
  const active = document.activeElement;
  return active instanceof HTMLElement && active.getAttribute(LIST_ATTRIBUTE) === list && active.hasAttribute(ITEM_ATTRIBUTE) ? active : null;
}

/** Id do item em foco; null = nenhum item da lista em foco. */
export function focusedListItemId(list: string): string | null {
  return focusedItem(list)?.getAttribute(ITEM_ATTRIBUTE) ?? null;
}

/** Leva o foco ao primeiro item (ex.: ↓ no campo de busca entra na lista). Devolve false se ela está vazia. */
export function focusFirstListItem(list: string): boolean {
  const first = itemsOf(list)[0];
  first?.focus();
  return Boolean(first);
}

/**
 * Anda o foco na lista. Sem item em foco, ↓ entra no primeiro; ↑ não faz nada (a página rola).
 * @returns false quando a tecla não foi usada (o navegador segue com o comportamento normal).
 */
export function moveListFocus(list: string, step: 1 | -1): boolean {
  const current = focusedItem(list);
  if (!current) return step === 1 && focusFirstListItem(list);
  const items = itemsOf(list);
  items[items.indexOf(current) + step]?.focus();
  return true;
}

/** No campo de busca: ↓ entra no primeiro item da lista (o resto das teclas fica com o campo). */
export function enterListOnArrowDown(list: string) {
  return (event: { key: string; preventDefault: () => void }) => {
    if (event.key === "ArrowDown" && focusFirstListItem(list)) event.preventDefault();
  };
}

/** Destaque do item em foco pelo teclado (o mesmo em todas as listas). */
export const LIST_ITEM_FOCUS = "outline-none focus-visible:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset";
