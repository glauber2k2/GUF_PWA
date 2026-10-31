/**
 * Assinatura paga: tipos, estado da tela e textos. A regra dos 7 dias (CDC, art. 49) e quem tem direito
 * a quê ficam no banco (`withdrawal_window`, `my_billing`); aqui só se lê o que ele decidiu.
 */
import { formatDayMonthYear } from "./dates";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";
export type BillingInterval = "month" | "year";
export type PaymentStatus = "paid" | "partially_refunded" | "refunded" | "disputed";
export type RefundStatus = "processing" | "refunded" | "failed";

export interface BillingSubscription {
  id: string;
  planCode: string;
  planName: string;
  status: SubscriptionStatus;
  startedAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  /** Fim do prazo para desistir com devolução total (null = sem pagamento ainda). */
  withdrawalEndsAt: string | null;
  /** Cancelar agora devolve `withdrawalRefundCents` e encerra o Pro na hora. */
  canWithdraw: boolean;
  withdrawalRefundCents: number;
  hasProcessingRefund: boolean;
  /** Existe cliente no gateway: dá para abrir o portal (cartão e faturas). */
  canManagePayment: boolean;
}

export interface BillingPayment {
  id: string;
  amountCents: number;
  refundedCents: number;
  currency: string;
  status: PaymentStatus;
  paidAt: string;
}

export interface BillingRefund {
  id: string;
  paymentId: string;
  amountCents: number;
  status: RefundStatus;
  origin: string;
  createdAt: string;
}

export interface MyBilling {
  subscription: BillingSubscription | null;
  payments: BillingPayment[];
  refunds: BillingRefund[];
}

/** Preço à venda (tabela `plan_prices`). */
export interface PlanPrice {
  planCode: string;
  interval: BillingInterval;
  amountCents: number;
  currency: string;
}

/** O que o cancelamento fez (resposta da Edge Function `billing`). */
export interface CancellationOutcome {
  mode: "refunded_and_ended" | "ends_at_period_end" | "ended";
  refund: "none" | "refunded" | "processing" | "failed" | "retry";
}

/** Situação da assinatura do ponto de vista da tela. */
export type SubscriptionView = "none" | "withdrawable" | "active" | "canceling" | "past_due" | "refunding" | "ended";

/** Retorno do checkout: o app espera o webhook liberar o Pro por até este tempo, conferindo a cada intervalo. */
export const CHECKOUT_CONFIRM_POLL_MS = 2_000;
export const CHECKOUT_CONFIRM_TIMEOUT_MS = 30_000;

const LIVE_STATUSES: readonly SubscriptionStatus[] = ["trialing", "active", "past_due"];

export function isSubscriptionLive(status: SubscriptionStatus): boolean {
  return LIVE_STATUSES.includes(status);
}

/** Qual cartão da assinatura mostrar (o mais urgente primeiro). */
export function subscriptionViewOf(subscription: BillingSubscription | null): SubscriptionView {
  if (!subscription) return "none";
  if (subscription.hasProcessingRefund) return "refunding";
  if (!isSubscriptionLive(subscription.status)) return "ended";
  if (subscription.status === "past_due") return "past_due";
  if (subscription.cancelAtPeriodEnd) return "canceling";
  return subscription.canWithdraw ? "withdrawable" : "active";
}

/** "R$ 19,90" */
export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

const INTERVAL_LABELS: Record<BillingInterval, string> = { month: "por mês", year: "por ano" };

const INTERVAL_SUFFIXES: Record<BillingInterval, string> = { month: "/mês", year: "/ano" };

/** "/mês" — ao lado do valor em destaque. */
export function formatIntervalSuffix(interval: BillingInterval): string {
  return INTERVAL_SUFFIXES[interval];
}

const INTERVAL_NAMES: Record<BillingInterval, string> = { month: "mensal", year: "anual" };

/** "Pro mensal" */
export function formatPlanPeriodName(planName: string, interval: BillingInterval): string {
  return `${planName} ${INTERVAL_NAMES[interval]}`;
}

/** "R$ 19,90 por mês" */
export function formatPlanPrice(price: PlanPrice): string {
  return `${formatMoney(price.amountCents, price.currency)} ${INTERVAL_LABELS[price.interval]}`;
}

const formatIsoDay = (iso: string | null): string => (iso ? formatDayMonthYear(new Date(iso)) : "");

/** Linha de situação do cartão da assinatura. */
export function subscriptionStatusText(subscription: BillingSubscription): string {
  const periodEnd = formatIsoDay(subscription.currentPeriodEnd);
  const texts: Record<SubscriptionView, string> = {
    none: "",
    withdrawable: `Renova em ${periodEnd}`,
    active: `Renova em ${periodEnd}`,
    canceling: `Cancelada · ${subscription.planName} até ${periodEnd}`,
    past_due: "Não conseguimos cobrar a renovação",
    refunding: "Recebemos seu cancelamento. Estamos processando a devolução.",
    ended: subscription.canceledAt ? `Encerrada em ${formatIsoDay(subscription.canceledAt)}` : "Encerrada",
  };
  return texts[subscriptionViewOf(subscription)];
}

const SUBSCRIPTION_BADGE_LABELS: Record<SubscriptionView, string> = {
  none: "Ativo",
  withdrawable: "Ativo",
  active: "Ativo",
  canceling: "Cancelada",
  past_due: "Pagamento pendente",
  refunding: "Devolvendo",
  ended: "Encerrada",
};

/** Selo do plano pago no cartão do plano atual ("none" = plano dado sem assinatura, ex.: cortesia). */
export function subscriptionBadgeLabel(view: SubscriptionView): string {
  return SUBSCRIPTION_BADGE_LABELS[view];
}

/** Aviso do prazo de desistência (só enquanto ele vale). */
export function withdrawalNotice(subscription: BillingSubscription): string | null {
  if (!subscription.canWithdraw || !subscription.withdrawalEndsAt) return null;
  return `Você pode desistir até ${formatIsoDay(subscription.withdrawalEndsAt)} e receber ${formatMoney(subscription.withdrawalRefundCents, "brl")} de volta.`;
}

export interface CancelConfirmationCopy {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Texto da confirmação: muda pelos 7 dias (o banco confirma a regra de novo ao cancelar). */
export function cancelConfirmationCopy(subscription: BillingSubscription): CancelConfirmationCopy {
  if (subscription.canWithdraw) {
    return {
      title: "Cancelar e receber de volta?",
      message: `Você está dentro dos 7 dias para desistir. Vamos devolver ${formatMoney(subscription.withdrawalRefundCents, "brl")} pela mesma forma de pagamento e o ${subscription.planName} termina agora.`,
      confirmLabel: "Cancelar e receber de volta",
    };
  }
  return {
    title: "Cancelar a assinatura?",
    message: `O ${subscription.planName} continua até ${formatIsoDay(subscription.currentPeriodEnd)} e não haverá nova cobrança. Você pode reativar até lá.`,
    confirmLabel: "Cancelar assinatura",
  };
}

export interface CancellationResultCopy {
  tone: "success" | "info" | "warning";
  title: string;
  message: string;
}

const REFUND_RESULT_COPY: Record<CancellationOutcome["refund"], CancellationResultCopy> = {
  none: { tone: "success", title: "Assinatura cancelada", message: "Não haverá nova cobrança." },
  refunded: {
    tone: "success",
    title: "Assinatura cancelada",
    message: "O valor volta pela mesma forma de pagamento em até 10 dias úteis, conforme o banco.",
  },
  processing: {
    tone: "info",
    title: "Assinatura cancelada",
    message: "A devolução está em andamento e aparece aqui quando o banco confirmar.",
  },
  failed: {
    tone: "warning",
    title: "Assinatura cancelada",
    message: "O sistema de pagamento não aceitou a devolução automática. Vamos fazer pelo atendimento e avisar você aqui.",
  },
  retry: {
    tone: "warning",
    title: "Assinatura cancelada",
    message: "A devolução ainda não foi confirmada. Toque em \"Concluir devolução\" em alguns minutos.",
  },
};

/** Aviso depois de cancelar. */
export function cancellationResultCopy(outcome: CancellationOutcome, periodEnd: string | null): CancellationResultCopy {
  if (outcome.mode === "ends_at_period_end") {
    return { tone: "success", title: "Assinatura cancelada", message: `O Pro continua até ${formatIsoDay(periodEnd)} e não haverá nova cobrança.` };
  }
  return REFUND_RESULT_COPY[outcome.refund];
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Pago",
  partially_refunded: "Devolvido em parte",
  refunded: "Devolvido",
  disputed: "Contestado",
};

/** "Pago" · "Devolvido R$ 19,90" */
export function paymentStatusLabel(payment: BillingPayment): string {
  const label = PAYMENT_STATUS_LABELS[payment.status];
  return payment.refundedCents > 0 && payment.status !== "disputed" ? `${label} ${formatMoney(payment.refundedCents, payment.currency)}` : label;
}
