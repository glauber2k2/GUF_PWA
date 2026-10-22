// Erros do provedor de IA: mensagem para o app e log sem conteúdo da conversa (LGPD).

interface ProviderError {
  name?: string;
  statusCode?: number;
  message?: string;
  lastError?: unknown;
  cause?: unknown;
}

/** Erro do provedor por baixo dos invólucros do AI SDK (RetryError.lastError, cause). */
function unwrapProviderError(error: unknown): ProviderError {
  let current = (error ?? {}) as ProviderError;
  for (let depth = 0; depth < 3 && current.statusCode === undefined; depth++) {
    const inner = (current.lastError ?? current.cause) as ProviderError | undefined;
    if (!inner) break;
    current = inner;
  }
  return current;
}

/** Mensagem para o app, com o código do provedor para diagnóstico (nada da conversa). */
export function toProviderErrorMessage(error: unknown): string {
  const { statusCode, name } = unwrapProviderError(error);
  if (statusCode === 429) return "O GUF AI está muito procurado agora. Tente de novo em alguns minutos. (código 429)";
  const code = statusCode ?? name ?? "desconhecido";
  return `O GUF AI não conseguiu responder agora. Tente de novo em instantes. (código ${code})`;
}

/** Log do erro sem conteúdo da conversa: tipo, status e o começo da mensagem do provedor. */
export function logProviderError(error: unknown) {
  const { name, statusCode, message } = unwrapProviderError(error);
  console.error("GUF AI: falha do provedor", { name, statusCode, message: message?.slice(0, 300) });
}

// Uma nova tentativa só: no plano gratuito o provedor responde 429 pedindo para esperar quase um
// minuto, e várias esperas estouravam o tempo da função com a tela parada em "pensando".
export const MAX_RETRIES = 1;
export const TIMEOUT = { totalMs: 60_000, firstChunkMs: 30_000 };
