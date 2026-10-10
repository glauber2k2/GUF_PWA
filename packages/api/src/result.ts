/** Resultado e erros das funções de dados (todas seguem `{ data, error }`, como o supabase-js). */

export type ApiErrorCode =
  | "workout_in_progress"
  | "workout_not_found"
  | "not_authenticated"
  | "network_error"
  | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  /** Mensagem pronta para o usuário: diz o que aconteceu e como resolver. */
  message: string;
}

/** Mesmo formato do supabase-js: sucesso com `data` ou falha com `error`, nunca os dois. */
export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  workout_in_progress: "Você já tem um treino em andamento. Retome ou finalize esse treino antes de começar outro.",
  workout_not_found: "Este treino já foi finalizado ou não está mais disponível. Volte para a Início.",
  not_authenticated: "Sua sessão expirou. Entre de novo para continuar.",
  network_error: "Sem conexão. Verifique a internet e tente de novo.",
  unknown: "Não foi possível carregar agora. Tente de novo em instantes.",
};

export function apiError(code: ApiErrorCode): ApiError {
  return { code, message: API_ERROR_MESSAGES[code] };
}

/** Erro de rede (sem conexão / servidor inalcançável) — a fila offline reenvia depois. */
export function isNetworkError(error: ApiError | null | undefined): boolean {
  return error?.code === "network_error";
}

/** Converte erros do PostgREST/rede no ApiError do app. */
export function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object") {
    const { code, message } = error as { code?: string; message?: string };
    if (code === "23505") return apiError("workout_in_progress"); // índice único: 1 treino em andamento
    if (code === "P0002") return apiError("workout_not_found"); // "Treino em andamento não encontrado"
    if (code === "PGRST301" || code === "42501") return apiError("not_authenticated");
    if (typeof message === "string" && /fetch|network|load failed/i.test(message)) return apiError("network_error");
  }
  if (error instanceof TypeError) return apiError("network_error");
  return apiError("unknown");
}
