import type { CSSProperties } from "react";

/** Atraso de cada parte do card na entrada (protótipo 2a: topo, figura e lista, números, observação, rodapé). */
export const FEED_ENTRANCE_DELAYS_MS = { header: 120, body: 200, stats: 280, note: 360, footer: 440 } as const;

export type FeedEntrancePart = keyof typeof FEED_ENTRANCE_DELAYS_MS;

/**
 * Entrada do card: "static" (sem animação, todos menos o primeiro), "waiting" (o primeiro, escondido
 * até a pessoa rolar até ele, para não aparecer parado e depois piscar) e "playing" (entrou na tela).
 */
export type FeedEntranceState = "static" | "waiting" | "playing";

/** Estado da entrada a partir de "pode animar" e "já entrou na tela". */
export function feedEntranceState(canAnimate: boolean, hasEntered: boolean): FeedEntranceState {
  if (!canAnimate) return "static";
  return hasEntered ? "playing" : "waiting";
}

/** Classe e atraso da entrada de uma parte do card. */
export function feedEntrance(state: FeedEntranceState, part: FeedEntrancePart): { className?: string; style?: CSSProperties } {
  if (state === "static") return {};
  if (state === "waiting") return { className: "opacity-0" };
  // Atraso escalonado (valor dinâmico).
  return { className: "animate-guf-up", style: { animationDelay: `${FEED_ENTRANCE_DELAYS_MS[part]}ms` } };
}

/** Classe da entrada do próprio card. */
export function feedCardEntranceClass(state: FeedEntranceState): string | undefined {
  if (state === "waiting") return "opacity-0";
  return state === "playing" ? "animate-guf-rise" : undefined;
}
