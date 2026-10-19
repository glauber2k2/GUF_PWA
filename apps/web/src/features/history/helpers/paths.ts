/** Id da seção do histórico na Início (alvo do "Esta semana" e de links antigos para /historico). */
export const HISTORY_ANCHOR = "historico";

/** Início rolada até o histórico; `search` mantém o mês e o período (?mes=…&periodo=…). */
export function historyAnchorPath(search = ""): string {
  return `/${search ? `?${search}` : ""}#${HISTORY_ANCHOR}`;
}
