/**
 * Em DESENVOLVIMENTO, leva o ?estado= da tela atual para o próximo caminho (continua no mock).
 * No build de produção devolve o caminho sem mudança.
 */
export function withDevState(path: string): string {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return path;
  const estado = new URLSearchParams(window.location.search).get("estado");
  if (!estado) return path;
  return `${path}${path.includes("?") ? "&" : "?"}estado=${encodeURIComponent(estado)}`;
}
