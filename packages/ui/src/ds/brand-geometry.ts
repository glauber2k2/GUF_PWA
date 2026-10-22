/*
 * Geometria da marca guf (Claude Design · "Guf Loading" e assets/guf-logo-*.svg).
 * Símbolo "Anel" na grade 48: anel de progresso aberto + ponto (a próxima série).
 * Wordmark com traço 7 da mesma grade do anel (cantos e curvas de raio 7–7,5).
 */

export const MARK_VIEWBOX = "0 0 48 48";

/** Logo completa (símbolo + wordmark), com a mesma margem nos quatro lados. */
export const LOGO_VIEWBOX = "-5.5 -14.05 141.5 76.65";
export const LOGO_ASPECT = 141.5 / 76.65;

export const RING = {
  cx: 24,
  cy: 24,
  r: 16,
  strokeWidth: 7,
  dasharray: "78.2 200",
  transform: "rotate(-20 24 24)",
} as const;

export const DOT = { cx: 32, cy: 10.14, r: 4.5 } as const;

export const WORDMARK_TRANSFORM = "translate(54 -4.6) scale(1.1)";

/** "g", "u", "f" desenhados como traços (sem fonte). */
export const WORDMARK_PATHS = [
  "M18.5 25A7.5 7.5 0 0 0 3.5 25V27A7.5 7.5 0 0 0 18.5 27",
  "M18.5 14V41A7.5 7.5 0 0 1 11 48.5H4",
  "M29.5 14V27A7.5 7.5 0 0 0 44.5 27",
  "M44.5 14V38",
  "M55.5 38V11A7 7 0 0 1 62.5 4H65.5",
  "M49.5 17.5H65.5",
] as const;
