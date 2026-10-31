// Cancelar a assinatura (pela pessoa no app ou pela exclusão da conta). Quem decide entre devolver tudo
// (7 dias, CDC art. 49) e manter até o fim do período é o banco (billing_begin_cancellation).
import type { BillingProvider, ProviderRefundStatus } from "./provider.ts";
import { billingProviderFor } from "./registry.ts";
import type { BillingStore, CancellationPlan, PlannedRefund } from "./store.ts";
import { syncSubscription, type BillingDeps } from "./subscription-sync.ts";

export type CancellationOrigin = "withdrawal" | "account_deletion";

export interface CancellationResult {
  /** refunded_and_ended = 7 dias (devolução + fim agora) · ends_at_period_end · ended (exclusão da conta). */
  mode: "refunded_and_ended" | "ends_at_period_end" | "ended";
  /**
   * none · refunded · processing (o gateway ainda está devolvendo, ex.: Pix) · failed (o gateway recusou:
   * fica para a equipe, auditado) · retry (o gateway não respondeu: chamar de novo é seguro, mesma chave).
   */
  refund: "none" | "refunded" | "processing" | "failed" | "retry";
}

const REFUND_ROW_STATUS: Record<ProviderRefundStatus, "refunded" | "processing" | "failed"> = {
  succeeded: "refunded",
  pending: "processing",
  failed: "failed",
};

/** O pior resultado entre os reembolsos decide o que a pessoa vê. */
const REFUND_OUTCOME_PRIORITY = ["retry", "failed", "processing"] as const;

/** Pede um reembolso; sem resposta, a linha fica em `processing` (a mesma chave evita devolver duas vezes). */
async function requestRefund(provider: BillingProvider, store: BillingStore, refund: PlannedRefund, origin: CancellationOrigin) {
  try {
    const result = await provider.refund({
      paymentRef: refund.paymentRef,
      amountCents: refund.amountCents,
      idempotencyKey: refund.id,
      gufRefundId: refund.id,
      gufOrigin: origin,
    });
    const status = REFUND_ROW_STATUS[result.status];
    await store.markRefund(refund.id, status, result.ref);
    return status;
  } catch (error) {
    console.error("Cobrança: reembolso não concluído", { provider: provider.id, message: (error as Error).message });
    return "retry" as const;
  }
}

async function endWithRefunds(deps: BillingDeps, plan: CancellationPlan, origin: CancellationOrigin): Promise<CancellationResult["refund"]> {
  // Primeiro parar de cobrar; depois devolver (se a devolução falhar, ela fica pendente, nunca a cobrança).
  await deps.provider.cancelNow(plan.subscriptionRef);
  await syncSubscription(deps, plan.subscriptionRef);
  if (plan.refunds.length === 0) return "none";

  const statuses: Awaited<ReturnType<typeof requestRefund>>[] = [];
  for (const refund of plan.refunds) statuses.push(await requestRefund(deps.provider, deps.store, refund, origin));
  return REFUND_OUTCOME_PRIORITY.find((outcome) => statuses.includes(outcome)) ?? "refunded";
}

/** Cancela uma assinatura da pessoa. Repetir é seguro (reembolsos pendentes são retomados, não duplicados). */
export async function cancelSubscription(deps: BillingDeps, userId: string, subscriptionId: string, origin: CancellationOrigin): Promise<CancellationResult> {
  const plan = await deps.store.beginCancellation(userId, subscriptionId, origin);

  if (plan.mode === "end_at_period_end") {
    await deps.provider.setCancelAtPeriodEnd(plan.subscriptionRef, true);
    await syncSubscription(deps, plan.subscriptionRef);
    return { mode: "ends_at_period_end", refund: "none" };
  }

  const refund = await endWithRefunds(deps, plan, origin);
  return { mode: plan.mode === "refund_and_end" ? "refunded_and_ended" : "ended", refund };
}

/** Desfaz o cancelamento agendado (antes do fim do período). */
export async function reactivateSubscription(deps: BillingDeps, subscriptionRef: string): Promise<void> {
  await deps.provider.setCancelAtPeriodEnd(subscriptionRef, false);
  await syncSubscription(deps, subscriptionRef);
}

/**
 * Exclusão da conta: encerra todas as assinaturas vivas (7 dias = devolução total). Lança se alguma
 * falhar, para a conta não sumir com uma cobrança ainda ativa no gateway.
 */
export async function cancelSubscriptionsForAccountDeletion(store: BillingStore, userId: string): Promise<void> {
  const live = await store.liveSubscriptions(userId);
  for (const subscription of live) {
    const result = await cancelSubscription({ provider: billingProviderFor(subscription.provider), store }, userId, subscription.id, "account_deletion");
    // Sem resposta do gateway, a devolução ficaria órfã (a pessoa não volta para tentar de novo).
    if (result.refund === "retry") throw new Error("Reembolso sem resposta do gateway");
  }
}
