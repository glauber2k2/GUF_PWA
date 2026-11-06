// Assinar pela loja de apps (Google Play, no app Android/TWA). O app compra pela própria loja; o
// servidor faz o resto: aceite ANTES de pagar (store-prepare) e, depois da compra, confere no Google,
// liga a compra à pessoa, confirma na loja e espelha a assinatura (store-confirm). Repetir é seguro.
import { recordPaidPayment } from "../_shared/billing/payments.ts";
import type { ProviderId, StorePurchaseProvider } from "../_shared/billing/provider.ts";
import { storePurchaseProviderFor } from "../_shared/billing/registry.ts";
import { BillingActionError } from "./action-error.ts";
import type { BillingAction } from "./context.ts";
import { acceptSubscriptionDocuments, parseSubscribeRequest } from "./subscribe-request.ts";

/** Lojas aceitas nas ações da loja (o Stripe vende pelo checkout). */
const STORE_PROVIDERS = new Set<ProviderId>(["google"]);
const PRODUCT_ID_PATTERN = /^[a-z0-9][a-z0-9._]{0,99}$/;
const MAX_PURCHASE_TOKEN_LENGTH = 512;

function storeProviderFrom(body: Record<string, unknown>): StorePurchaseProvider {
  const id = body.provider;
  if (typeof id !== "string" || !STORE_PROVIDERS.has(id as ProviderId)) throw new BillingActionError("invalid_request", 400);
  return storePurchaseProviderFor(id as ProviderId);
}

function purchaseFrom(body: Record<string, unknown>): { purchaseToken: string; productId: string } {
  const { purchaseToken, productId } = body;
  const isValid =
    typeof purchaseToken === "string" &&
    purchaseToken.length > 0 &&
    purchaseToken.length <= MAX_PURCHASE_TOKEN_LENGTH &&
    typeof productId === "string" &&
    PRODUCT_ID_PATTERN.test(productId);
  if (!isValid) throw new BillingActionError("invalid_request", 400);
  return { purchaseToken, productId };
}

/** Antes de abrir a compra na loja: aceites gravados e o produto da periodicidade escolhida. */
export const storePrepare: BillingAction = async (context) => {
  const request = parseSubscribeRequest(context.body);
  const provider = storeProviderFrom(context.body);
  const offer = await context.store.checkoutContext(context.userId, request.planCode, provider.id, request.interval);
  await acceptSubscriptionDocuments(context, request);
  return { productId: offer.priceRef };
};

/** Depois da compra na loja: confere, liga à pessoa, confirma e espelha. `pending` = pagamento ainda em análise. */
export const storeConfirm: BillingAction = async (context) => {
  const provider = storeProviderFrom(context.body);
  const { purchaseToken, productId } = purchaseFrom(context.body);

  // A compra precisa existir no Google e ser do produto informado (o token não vem de outro lugar).
  const purchase = await provider.getStorePurchase(purchaseToken);
  if (purchase.productRef !== productId) throw new BillingActionError("store_purchase_invalid", 409);

  // Vínculo primeiro: se o pagamento ainda estiver pendente, o aviso do Google encontra o dono depois.
  await context.store.linkPurchase(context.userId, provider.id, purchaseToken);
  if (!purchase.subscription.status) return { status: "pending" };

  if (!purchase.isAcknowledged) await provider.acknowledgePurchase({ purchaseRef: purchaseToken, productRef: productId });
  await recordPaidPayment({ provider, store: context.store }, purchaseToken);
  return { status: "active" };
};
