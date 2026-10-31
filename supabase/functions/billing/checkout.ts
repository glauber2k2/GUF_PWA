// Contratar (docs/stripe-payments-plan.md § 2.1): aceite ANTES de pagar, preço conferido no gateway,
// página de pagamento hospedada. O Pro só nasce pelo webhook.
import { BillingStoreError } from "../_shared/billing/store.ts";
import { activeProviderId, billingProviderFor } from "../_shared/billing/registry.ts";
import { BillingActionError } from "./action-error.ts";
import type { BillingAction } from "./context.ts";
import { isUuid } from "./validation.ts";

const PLAN_CODE_PATTERN = /^[a-z][a-z_]{1,29}$/;
const PLATFORMS = new Set(["web", "ios", "android"]);
const MAX_DOCUMENTS = 10;

interface CheckoutInput {
  planCode: string;
  acceptedDocumentIds: string[];
  platform: string;
}

function parseCheckoutInput(body: Record<string, unknown>): CheckoutInput {
  const { planCode, acceptedDocumentIds, platform } = body;
  const validIds = Array.isArray(acceptedDocumentIds) && acceptedDocumentIds.length <= MAX_DOCUMENTS && acceptedDocumentIds.every(isUuid);
  if (typeof planCode !== "string" || !PLAN_CODE_PATTERN.test(planCode) || !validIds || typeof platform !== "string" || !PLATFORMS.has(platform)) {
    throw new BillingActionError("invalid_request", 400);
  }
  return { planCode, acceptedDocumentIds: acceptedDocumentIds as string[], platform };
}

/** Grava os aceites com o token da pessoa e confere que nada ficou pendente (CDC, art. 46). */
async function acceptSubscriptionDocuments({ userClient }: Parameters<BillingAction>[0], input: CheckoutInput): Promise<void> {
  if (input.acceptedDocumentIds.length > 0) {
    const { error } = await userClient.rpc("accept_documents", {
      p_document_ids: input.acceptedDocumentIds,
      p_source: "subscribe",
      p_platform: input.platform,
    });
    if (error?.code === "22023") throw new BillingActionError("subscription_documents_outdated", 409);
    if (error) throw new BillingStoreError(error.message, error.code ?? null);
  }

  const { data: pending, error } = await userClient.rpc("pending_subscription_documents");
  if (error) throw new BillingStoreError(error.message, error.code ?? null);
  if (Array.isArray(pending) && pending.length > 0) throw new BillingActionError("subscription_documents_outdated", 409);
}

export const checkout: BillingAction = async (context) => {
  const input = parseCheckoutInput(context.body);
  const provider = billingProviderFor(activeProviderId());
  const offer = await context.store.checkoutContext(context.userId, input.planCode, provider.id);

  // O preço mostrado no app vem do banco: se o gateway cobrar diferente, nada é vendido.
  const price = await provider.getPrice(offer.priceRef);
  const priceMatches = price.isActive && price.amountCents === offer.amountCents && price.currency === offer.currency && price.interval === offer.interval;
  if (!priceMatches) {
    console.error("Cobrança: preço do banco diverge do gateway", { provider: provider.id });
    throw new BillingActionError("billing_unavailable", 503);
  }

  await acceptSubscriptionDocuments(context, input);

  const customerRef = offer.customerRef ??
    (await context.store.linkCustomer(context.userId, provider.id, await provider.createCustomer({ userId: context.userId, email: context.email })));

  await provider.expireOpenCheckouts(customerRef);
  const session = await provider.createCheckout({
    customerRef,
    priceRef: offer.priceRef,
    userId: context.userId,
    successUrl: `${context.appUrl}/planos/?assinatura=confirmando`,
    cancelUrl: `${context.appUrl}/planos/`,
  });
  return { url: session.url };
};
