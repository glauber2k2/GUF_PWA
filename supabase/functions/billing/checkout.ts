// Contratar (docs/stripe-payments-plan.md § 2.1): aceite ANTES de pagar, preço conferido no gateway,
// página de pagamento hospedada. O Pro só nasce pelo webhook.
import { activeProviderId, billingProviderFor } from "../_shared/billing/registry.ts";
import { BillingActionError } from "./action-error.ts";
import type { BillingAction } from "./context.ts";
import { acceptSubscriptionDocuments, parseSubscribeRequest } from "./subscribe-request.ts";

export const checkout: BillingAction = async (context) => {
  const request = parseSubscribeRequest(context.body);
  const provider = billingProviderFor(activeProviderId());
  const offer = await context.store.checkoutContext(context.userId, request.planCode, provider.id, request.interval);

  // O preço mostrado no app vem do banco: se o gateway cobrar diferente, nada é vendido.
  const price = await provider.getPrice(offer.priceRef);
  const priceMatches = price.isActive && price.amountCents === offer.amountCents && price.currency === offer.currency && price.interval === offer.interval;
  if (!priceMatches) {
    console.error("Cobrança: preço do banco diverge do gateway", { provider: provider.id });
    throw new BillingActionError("billing_unavailable", 503);
  }

  await acceptSubscriptionDocuments(context, request);

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
