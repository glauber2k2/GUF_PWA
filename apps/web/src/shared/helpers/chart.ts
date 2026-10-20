/**
 * Gráficos do Recharts sem o contorno de foco ao tocar. O Recharts 3 deixa a área do gráfico
 * focável (setas do teclado navegam entre os pontos) e também as camadas internas (grupo das
 * barras, balão; `tabindex=-1`): o toque dava foco a elas e o contorno verde aparecia em volta do
 * gráfico ou da barra tocada. O balão com os dados do ponto tocado e a agulha continuam, e o
 * teclado continua navegando pelos pontos.
 */
export const CHART_WITHOUT_FOCUS_RING = "[&_*:focus]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none";
