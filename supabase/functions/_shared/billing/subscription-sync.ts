// Espelha no guf a assinatura como o gateway a vê agora. É o único caminho que liga ou desliga o Pro pago:
// webhook, cancelamento e reativação passam por aqui (o retorno do checkout nunca libera nada).
import type { BillingProvider } from "./provider.ts";
import type { BillingStore, SyncOutcome } from "./store.ts";

export interface BillingDeps {
  provider: BillingProvider;
  store: BillingStore;
}

const DUPLICATE_NOTICE = {
  title: "Assinatura duplicada desfeita",
  body: "Você assinou duas vezes ao mesmo tempo. Cancelamos a assinatura mais nova e devolvemos o valor dela.",
};

/** Relê a assinatura no gateway e grava no banco. Assinatura ainda sem pagamento não muda nada. */
export async function syncSubscription({ provider, store }: BillingDeps, subscriptionRef: string): Promise<SyncOutcome | null> {
  const subscription = await provider.getSubscription(subscriptionRef);
  if (!subscription.status) return null;

  const outcome = await store.syncSubscription(provider.id, { ...subscription, status: subscription.status });
  if (outcome.outcome === "duplicate") await undoDuplicate({ provider, store }, subscription.ref, subscription.latestPaymentRef, outcome.userId);
  return outcome;
}

/**
 * Segunda assinatura viva da mesma pessoa (duas abas, dois toques): a mais nova é cancelada e devolvida
 * inteira, para não haver cobrança em dobro (CDC, art. 42). O reembolso volta pelo webhook com a origem.
 */
async function undoDuplicate({ provider, store }: BillingDeps, subscriptionRef: string, paymentRef: string | null, userId: string) {
  await provider.cancelNow(subscriptionRef);
  if (paymentRef) {
    await provider.refund({ paymentRef, amountCents: null, idempotencyKey: `duplicate-${subscriptionRef}`, gufRefundId: null, gufOrigin: "duplicate" });
  }
  await store.notifyUser(userId, DUPLICATE_NOTICE.title, DUPLICATE_NOTICE.body);
  console.warn("Cobrança: assinatura duplicada desfeita", { provider: provider.id });
}
