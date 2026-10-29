/** Destaque de cada lugar no pódio. */
export type PodiumTone = "me" | "neutral";

/**
 * Só você ganha cor (o volt da identidade), em qualquer posição; os demais lugares, inclusive o 1º,
 * ficam neutros (a posição já aparece pela altura do degrau e pela coroa). Tom novo = valor aqui +
 * estilo em PODIUM_TONE_STYLES.
 */
export function podiumTone(isMe: boolean): PodiumTone {
  return isMe ? "me" : "neutral";
}

export const PODIUM_TONE_STYLES: Record<PodiumTone, { crown: string; ring: string; step: string }> = {
  me: { crown: "text-accent-text", ring: "border-accent", step: "bg-accent text-accent-foreground" },
  neutral: { crown: "text-fg-muted", ring: "border-transparent", step: "bg-surface-3 text-fg-secondary" },
};

/** Destaque no pódio do campeão (temporada encerrada). */
export type SeasonPodiumTone = "champion" | "me" | "neutral";

/**
 * No pódio do campeão (Claude Design "Podio Encerrado" · 1c) o 1º ganha o volt cheio, mesmo não sendo
 * você: é a celebração de quem venceu. Você, no 2º ou 3º, ganha o anel e o degrau em volt claro.
 */
export function seasonPodiumTone(isMe: boolean, isWinner: boolean): SeasonPodiumTone {
  if (isWinner) return "champion";
  return isMe ? "me" : "neutral";
}

export const SEASON_PODIUM_TONE_STYLES: Record<SeasonPodiumTone, { ring: string; step: string }> = {
  champion: { ring: "border-accent", step: "bg-accent text-accent-foreground" },
  me: { ring: "border-accent", step: "bg-accent/16 text-accent-text" },
  neutral: { ring: "border-transparent", step: "bg-surface-3 text-fg-secondary" },
};
