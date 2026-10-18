/**
 * Rotas do Resumo e da Evolução (site estático: rota fixa + query string).
 * Em DESENVOLVIMENTO, o ?estado= da tela atual segue junto para continuar no mock.
 */
function withDevState(path: string): string {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return path;
  const estado = new URLSearchParams(window.location.search).get("estado");
  if (!estado) return path;
  return `${path}${path.includes("?") ? "&" : "?"}estado=${encodeURIComponent(estado)}`;
}

export const summaryPath = (sessionId: string) => withDevState(`/treino/resumo?id=${encodeURIComponent(sessionId)}`);
export const exercisePath = (exerciseId: string) => withDevState(`/exercicio?id=${encodeURIComponent(exerciseId)}`);
export const exerciseSearchPath = () => withDevState("/exercicio/busca");
