// Pedido de assinatura (comum a qualquer gateway): validação do corpo e aceite dos documentos
// ANTES de qualquer cobrança (CDC, art. 46). O checkout do Stripe e a compra na loja usam os dois.
import type { BillingInterval } from "../_shared/billing/provider.ts";
import { BillingStoreError } from "../_shared/billing/store.ts";
import { BillingActionError } from "./action-error.ts";
import type { BillingActionContext } from "./context.ts";
import { isUuid } from "./validation.ts";

const PLAN_CODE_PATTERN = /^[a-z][a-z_]{1,29}$/;
const PLATFORMS = new Set(["web", "ios", "android"]);
const INTERVALS = new Set<BillingInterval>(["month", "year"]);
const MAX_DOCUMENTS = 10;

export interface SubscribeRequest {
  planCode: string;
  /** Mensal ou anual (app antigo não envia: mensal). */
  interval: BillingInterval;
  acceptedDocumentIds: string[];
  platform: string;
}

function isInterval(value: unknown): value is BillingInterval {
  return typeof value === "string" && INTERVALS.has(value as BillingInterval);
}

/** Lê e valida o pedido; qualquer campo fora do formato → `invalid_request`. */
export function parseSubscribeRequest(body: Record<string, unknown>): SubscribeRequest {
  const { planCode, acceptedDocumentIds, platform } = body;
  const interval = body.interval ?? "month";
  const validIds = Array.isArray(acceptedDocumentIds) && acceptedDocumentIds.length <= MAX_DOCUMENTS && acceptedDocumentIds.every(isUuid);
  const isValid =
    typeof planCode === "string" && PLAN_CODE_PATTERN.test(planCode) && validIds && typeof platform === "string" && PLATFORMS.has(platform) && isInterval(interval);
  if (!isValid) throw new BillingActionError("invalid_request", 400);
  return { planCode, interval, acceptedDocumentIds: acceptedDocumentIds as string[], platform };
}

/** Grava os aceites com o token da pessoa e confere que nada ficou pendente. */
export async function acceptSubscriptionDocuments({ userClient }: BillingActionContext, request: SubscribeRequest): Promise<void> {
  if (request.acceptedDocumentIds.length > 0) {
    const { error } = await userClient.rpc("accept_documents", {
      p_document_ids: request.acceptedDocumentIds,
      p_source: "subscribe",
      p_platform: request.platform,
    });
    if (error?.code === "22023") throw new BillingActionError("subscription_documents_outdated", 409);
    if (error) throw new BillingStoreError(error.message, error.code ?? null);
  }

  const { data: pending, error } = await userClient.rpc("pending_subscription_documents");
  if (error) throw new BillingStoreError(error.message, error.code ?? null);
  if (Array.isArray(pending) && pending.length > 0) throw new BillingActionError("subscription_documents_outdated", 409);
}
