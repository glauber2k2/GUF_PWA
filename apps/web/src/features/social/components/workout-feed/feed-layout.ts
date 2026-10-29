/**
 * Medidas fixas do card do feed (protótipo 2a, 450 px de altura): nenhuma parte muda de tamanho pelo
 * conteúdo. O que não cabe é cortado (reticências ou "+N") e aparece inteiro no resumo do treino.
 * Somadas (com os espaços de 10 px e o recuo de 14 px) cabem nos 450 px; o rodapé vai para o fim.
 */
export const FEED_SIZES = {
  card: "h-[450px]",
  header: "h-10",
  /** Figura e lista: 4 linhas de exercício + a linha "+N exercícios". */
  body: "h-[186px]",
  exerciseRow: "h-10",
  moreRow: "h-[26px]",
  stats: "h-[52px]",
  /** Duas linhas de observação. */
  note: "h-[50px]",
  footer: "h-[30px]",
} as const;
