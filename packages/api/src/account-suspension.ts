/**
 * Conta suspensa pela equipe: o middleware do PostgREST (`guard_suspended_account`, migration
 * 20261025130000) recusa toda requisição com GU001 enquanto o token já emitido não expira.
 * O cliente confere as respostas num ponto só (o `fetch` do supabase-js) para o app reagir na
 * primeira chamada, seja ela qual for, sem cada tela tratar o erro.
 */

/** Código do erro do banco para conta suspensa. */
export const ACCOUNT_SUSPENDED_DB_CODE = "GU001";

/** Só as respostas da API REST passam pelo middleware (Auth, Storage e Edge Functions não). */
const REST_PATH = "/rest/v1/";

export interface AccountSuspension {
  /** Fim da suspensão (ISO 8601); `null` = indeterminada. */
  endsAt: string | null;
}

export type AccountSuspendedListener = (suspension: AccountSuspension) => void;

/**
 * Lê a suspensão de uma resposta da API REST.
 * @returns a suspensão, ou `null` quando a resposta não é o erro GU001.
 */
export async function readAccountSuspension(response: Response): Promise<AccountSuspension | null> {
  if (response.ok || !response.url.includes(REST_PATH)) return null;
  try {
    const body = (await response.clone().json()) as { code?: string; hint?: string | null };
    if (body?.code !== ACCOUNT_SUSPENDED_DB_CODE) return null;
    return { endsAt: body.hint ? body.hint : null };
  } catch {
    return null;
  }
}

/**
 * Envolve o `fetch` para avisar `onSuspended` quando a API recusar a conta suspensa.
 * A resposta segue intacta para quem chamou (o erro vira `account_suspended` em `toApiError`).
 */
export function withAccountSuspensionCheck(fetchImpl: typeof fetch, onSuspended: AccountSuspendedListener): typeof fetch {
  return async (input, init) => {
    const response = await fetchImpl(input, init);
    const suspension = await readAccountSuspension(response);
    if (suspension) onSuspended(suspension);
    return response;
  };
}
