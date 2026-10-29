import type { CSSProperties } from "react";

/** Atraso de cada parte do card na entrada (protótipo 2a: topo, figura e lista, números, observação, rodapé). */
export const FEED_ENTRANCE_DELAYS_MS = { header: 120, body: 200, stats: 280, note: 360, footer: 440 } as const;

export type FeedEntrancePart = keyof typeof FEED_ENTRANCE_DELAYS_MS;

/**
 * Classe e atraso da entrada de uma parte do card. Só o card animado (o primeiro da lista, ao abrir)
 * recebe; os outros ficam parados, sem custo de animação.
 */
export function feedEntrance(isAnimated: boolean, part: FeedEntrancePart): { className?: string; style?: CSSProperties } {
  if (!isAnimated) return {};
  // Atraso escalonado (valor dinâmico).
  return { className: "animate-guf-up", style: { animationDelay: `${FEED_ENTRANCE_DELAYS_MS[part]}ms` } };
}
