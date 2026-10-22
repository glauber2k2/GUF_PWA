/** Em desenvolvimento, leva o ?estado= da página atual nos links (o mock continua ligado). */
export function withDevState(path: string): string {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return path;
  const state = new URLSearchParams(window.location.search).get("estado");
  if (!state) return path;
  return `${path}${path.includes("?") ? "&" : "?"}estado=${encodeURIComponent(state)}`;
}
