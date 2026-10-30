// Pagamentos, reembolsos e contestações vindos do gateway (webhook).
import { syncSubscription, type BillingDeps } from "./subscription-sync.ts";

const REFUND_NOTICE = {
  title: "Reembolso feito",
  body: "Fizemos um reembolso da sua assinatura do guf. O valor volta pela mesma forma de pagamento em até 10 dias úteis, conforme o banco.",
};

const REFUND_ENDED_NOTICE = {
  title: "Reembolso feito e Pro encerrado",
  body: "Devolvemos o valor da sua assinatura e o Pro foi encerrado. O dinheiro volta em até 10 dias úteis, conforme o banco.",
};

const DISPUTE_NOTICE = {
  title: "Assinatura cancelada",
  body: "Recebemos uma contestação do seu pagamento no cartão. Cancelamos a assinatura para não haver nova cobrança.",
};

/** Pagamento confirmado: espelha a assinatura (pode chegar antes do evento dela) e registra o valor. */
export async function recordPaidPayment(deps: BillingDeps, paymentRef: string): Promise<void> {
  const payment = await deps.provider.getPayment(paymentRef);
  if (!payment.isPaid || !payment.paidAt) return;
  if (payment.subscriptionRef) await syncSubscription(deps, payment.subscriptionRef);
  await deps.store.recordPayment(deps.provider.id, { ...payment, paidAt: payment.paidAt });
}

/**
 * Reembolso criado ou atualizado (pelo app ou no painel do gateway). Devolução TOTAL do pagamento que
 * cobre o período atual, feita fora do app, encerra o Pro e a assinatura: o dinheiro voltou, o acesso acaba.
 */
export async function applyRefundChange(deps: BillingDeps, ref: string): Promise<void> {
  const state = await deps.provider.getRefundState(ref);
  if (!state.paymentRef) return;
  const outcome = await deps.store.recordRefunds(deps.provider.id, state);
  if (outcome.outcome !== "recorded" || !outcome.newOutsideRefund) return;

  const endsAccess = outcome.fullyRefunded && outcome.isLatestPayment && outcome.subscriptionLive && outcome.subscriptionRef;
  if (endsAccess) {
    await deps.provider.cancelNow(outcome.subscriptionRef!);
    await syncSubscription(deps, outcome.subscriptionRef!);
  }
  if (outcome.userId) {
    const notice = endsAccess ? REFUND_ENDED_NOTICE : REFUND_NOTICE;
    await deps.store.notifyUser(outcome.userId, notice.title, notice.body);
  }
}

/** Contestação aberta: marca o pagamento e encerra a assinatura (evita cobrar de novo quem contestou). */
export async function applyDispute(deps: BillingDeps, paymentRef: string): Promise<void> {
  const { userId, subscriptionRef } = await deps.store.recordDispute(deps.provider.id, paymentRef);
  if (!subscriptionRef) return;
  await deps.provider.cancelNow(subscriptionRef);
  await syncSubscription(deps, subscriptionRef);
  if (userId) await deps.store.notifyUser(userId, DISPUTE_NOTICE.title, DISPUTE_NOTICE.body);
}
