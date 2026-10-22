import { toApiError, type ApiResult } from "../result";

/** Executa uma consulta do supabase-js e devolve o `{ data, error }` do app (erros já traduzidos). */
export async function runQuery<T>(call: () => PromiseLike<{ data: T; error: unknown }>): Promise<ApiResult<T>> {
  try {
    const { data, error } = await call();
    return error ? { data: null, error: toApiError(error) } : { data, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}
