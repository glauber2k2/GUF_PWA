/*
 * Contrato "barra fixa no rodapé": qualquer camada presa ao fundo da tela (menu inferior, mini card,
 * "Salvar", descanso do treino, folhas abertas…) se marca com este atributo e o que flutua por cima
 * (a pilha de avisos) se posiciona acima da mais alta. Quem marca não conhece quem mede, e vice-versa.
 */

export const BOTTOM_BAR_ATTRIBUTE = "data-bottom-bar";

/** Espalhar no elemento da barra. */
export const BOTTOM_BAR_PROPS = { [BOTTOM_BAR_ATTRIBUTE]: "" } as const;

export const BOTTOM_BAR_SELECTOR = `[${BOTTOM_BAR_ATTRIBUTE}]`;
