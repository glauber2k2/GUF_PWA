/**
 * Gráficos do Recharts sem o contorno de foco ao tocar. O Recharts 3 deixa a área do gráfico
 * focável (setas do teclado navegam entre os pontos), e o toque dava foco a ela: o contorno
 * aparecia em volta do gráfico inteiro. O balão com os dados do ponto tocado continua, e o
 * teclado continua navegando pelos pontos.
 */
export const CHART_WITHOUT_FOCUS_RING = "[&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none";
