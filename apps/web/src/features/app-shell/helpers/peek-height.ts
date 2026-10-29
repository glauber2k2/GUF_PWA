/** Posição de um item dentro da lista rolável (px, a partir do topo do conteúdo). */
export interface PeekItem {
  top: number;
  height: number;
}

/** Atributo que marca os itens que contam para o corte (os outros filhos da lista, como títulos, não). */
const PEEK_ITEM_ATTRIBUTE = "data-peek-item";

/** Espalhar no item da lista que conta para o corte. */
export const PEEK_ITEM_PROPS = { [PEEK_ITEM_ATTRIBUTE]: "" } as const;

/** Seletor dos itens marcados, filhos diretos da lista. */
export const PEEK_ITEM_SELECTOR = `:scope > [${PEEK_ITEM_ATTRIBUTE}]`;

/** Teto padrão da folha: 85% da altura da tela. */
export const DEFAULT_MAX_SHEET_SHARE = 0.85;

/** Parte do último item que fica visível quando a lista não cabe (metade = "tem mais embaixo"). */
export const PEEK_VISIBLE_SHARE = 0.5;

/**
 * Altura da lista: o conteúdo inteiro quando cabe; senão, corta no meio do último item que cabe
 * pela metade, para mostrar que a lista continua.
 * @param items itens na ordem da lista
 * @param contentHeight altura total do conteúdo
 * @param available espaço máximo para a lista
 * @returns altura em px
 */
export function peekListHeight(items: readonly PeekItem[], contentHeight: number, available: number): number {
  if (contentHeight <= available) return contentHeight;
  const cuts = items.map((item) => item.top + item.height * PEEK_VISIBLE_SHARE).filter((cut) => cut <= available);
  return cuts.length > 0 ? Math.max(...cuts) : available;
}
