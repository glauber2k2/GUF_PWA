import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import { currentUserId } from "./shared";

/* =====================================================================
 * Contrato — avisos no celular (Web Push). SÓ ONLINE: quem chama trata network_error.
 * A inscrição é do APARELHO: cada celular ou navegador liga e desliga a sua.
 * ===================================================================== */

/** Inscrição do navegador (PushSubscription.toJSON()): endereço no serviço de push e chaves públicas. */
export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface PushApi {
  /** Inscreve este aparelho para receber os avisos da conta logada (RPC save_push_subscription). */
  savePushSubscription: (client: GufClient, input: PushSubscriptionKeys) => Result;
  /** Remove a inscrição deste aparelho (desligar os avisos ou sair da conta). */
  deletePushSubscription: (client: GufClient, input: { endpoint: string }) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

export const savePushSubscription: PushApi["savePushSubscription"] = async (client, { endpoint, p256dh, auth }) => {
  try {
    const { error } = await client.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: p256dh, p_auth: auth });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const deletePushSubscription: PushApi["deletePushSubscription"] = async (client, { endpoint }) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { error } = await client.from("push_subscriptions").delete().eq("endpoint", endpoint);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const pushApi = { savePushSubscription, deletePushSubscription } satisfies PushApi;
