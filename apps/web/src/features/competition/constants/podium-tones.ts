/** Destaque de cada lugar no pódio. */
export type PodiumTone = "leader" | "me" | "neutral";

/**
 * 1º lugar em dourado (o mesmo dos recordes), mesmo quando é você; você fora do 1º em volt;
 * os demais neutros. Tom novo = valor aqui + estilo em PODIUM_TONE_STYLES.
 */
export function podiumTone(rank: number, isMe: boolean): PodiumTone {
  if (rank === 1) return "leader";
  return isMe ? "me" : "neutral";
}

export const PODIUM_TONE_STYLES: Record<PodiumTone, { crown: string; ring: string; step: string }> = {
  leader: { crown: "text-pr-text", ring: "border-pr", step: "bg-pr text-pr-foreground" },
  me: { crown: "text-accent-text", ring: "border-accent", step: "bg-accent text-accent-foreground" },
  neutral: { crown: "text-fg-muted", ring: "border-transparent", step: "bg-surface-3 text-fg-secondary" },
};
