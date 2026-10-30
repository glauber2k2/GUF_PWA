// Gerenciar a assinatura: cancelar (com a regra dos 7 dias), reativar e abrir o portal do gateway.
import { cancelSubscription, reactivateSubscription } from "../_shared/billing/cancellation.ts";
import { activeProviderId, billingProviderFor } from "../_shared/billing/registry.ts";
import type { OwnedSubscription } from "../_shared/billing/store.ts";
import { BillingActionError } from "./action-error.ts";
import type { BillingAction, BillingActionContext } from "./context.ts";
import { isUuid } from "./validation.ts";

/** Assinatura do id enviado, desde que seja da pessoa logada (senão, a mesma resposta de "não existe"). */
async function requireOwnedSubscription({ body, store, userId }: BillingActionContext): Promise<OwnedSubscription> {
  if (!isUuid(body.subscriptionId)) throw new BillingActionError("invalid_request", 400);
  const subscription = await store.ownedSubscription(userId, body.subscriptionId);
  if (!subscription) throw new BillingActionError("subscription_not_found", 404);
  return subscription;
}

export const cancel: BillingAction = async (context) => {
  const subscription = await requireOwnedSubscription(context);
  const provider = billingProviderFor(subscription.provider);
  const result = await cancelSubscription({ provider, store: context.store }, context.userId, subscription.id, "withdrawal");
  return { mode: result.mode, refund: result.refund };
};

export const reactivate: BillingAction = async (context) => {
  const subscription = await requireOwnedSubscription(context);
  const canReactivate = subscription.cancelAtPeriodEnd && ["trialing", "active", "past_due"].includes(subscription.status);
  if (!canReactivate) throw new BillingActionError("subscription_not_found", 404);
  await reactivateSubscription({ provider: billingProviderFor(subscription.provider), store: context.store }, subscription.providerRef);
  return { ok: true };
};

export const portal: BillingAction = async ({ store, userId, appUrl }) => {
  const provider = billingProviderFor(activeProviderId());
  const customerRef = await store.customerOf(userId, provider.id);
  if (!customerRef) throw new BillingActionError("subscription_not_found", 404);
  return provider.createPortalSession({ customerRef, returnUrl: `${appUrl}/planos/` });
};
