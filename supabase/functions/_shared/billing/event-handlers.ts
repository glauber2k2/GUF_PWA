// Um handler por tipo de evento normalizado (aberto/fechado: tipo novo = uma entrada).
import type { BillingEvent } from "./provider.ts";
import { applyDispute, applyRefundChange, recordPaidPayment } from "./payments.ts";
import { syncSubscription, type BillingDeps } from "./subscription-sync.ts";

type HandlerFor<K extends BillingEvent["kind"]> = (deps: BillingDeps, event: Extract<BillingEvent, { kind: K }>) => Promise<void>;

const BILLING_EVENT_HANDLERS: { [K in BillingEvent["kind"]]: HandlerFor<K> } = {
  subscription_changed: async (deps, event) => {
    await syncSubscription(deps, event.subscriptionRef);
  },
  payment_succeeded: (deps, event) => recordPaidPayment(deps, event.paymentRef),
  refund_changed: (deps, event) => applyRefundChange(deps, event.ref),
  payment_disputed: (deps, event) => applyDispute(deps, event.paymentRef),
  ignored: async () => {},
};

export function handleBillingEvent(deps: BillingDeps, event: BillingEvent): Promise<void> {
  const handler = BILLING_EVENT_HANDLERS[event.kind] as HandlerFor<typeof event.kind>;
  return handler(deps, event as never);
}
