import {
  formatDayMonthYear,
  formatIntervalSuffix,
  formatMoney,
  subscriptionBadgeLabel,
  subscriptionStatusText,
  subscriptionViewOf,
  withdrawalNotice,
  type BillingSubscription,
  type Entitlements,
  type PlanPrice,
} from "@guf/core";
import type { PaidPlanCardProps } from "@/features/plans/components/current-plan-card";

const formatIsoDay = (iso: string) => formatDayMonthYear(new Date(iso));

/** Data do cartão: próxima cobrança, fim do plano cancelado ou validade do direito sem assinatura. */
function buildDateFact(entitlements: Entitlements, subscription: BillingSubscription | null): PaidPlanCardProps["date"] {
  const view = subscriptionViewOf(subscription);
  if (subscription?.currentPeriodEnd && (view === "withdrawable" || view === "active")) {
    return { label: "Próxima cobrança", value: formatIsoDay(subscription.currentPeriodEnd) };
  }
  if (subscription?.currentPeriodEnd && view === "canceling") {
    return { label: `${entitlements.planName} até`, value: formatIsoDay(subscription.currentPeriodEnd) };
  }
  if (view === "none" || view === "ended") {
    return { label: "Válido até", value: entitlements.validUntil ? formatIsoDay(entitlements.validUntil) : "Sem prazo" };
  }
  return null;
}

function buildNotice(subscription: BillingSubscription | null): PaidPlanCardProps["notice"] {
  if (!subscription) return null;
  const view = subscriptionViewOf(subscription);
  if (view === "past_due") {
    return { tone: "warning", text: `Não conseguimos cobrar seu cartão. Atualize o pagamento para manter o ${subscription.planName}.` };
  }
  if (view === "refunding") return { tone: "accent", text: subscriptionStatusText(subscription) };
  const withdrawal = withdrawalNotice(subscription);
  return withdrawal ? { tone: "accent", text: withdrawal } : null;
}

/**
 * Cartão do plano pago a partir do que o banco decidiu (direitos e assinatura). Sem assinatura viva
 * (ex.: cortesia), mostra só a validade; o valor aparece só quando existe cobrança.
 */
export function buildPaidPlanCard(
  entitlements: Entitlements,
  subscription: BillingSubscription | null,
  price: PlanPrice | null,
): PaidPlanCardProps {
  const view = subscriptionViewOf(subscription);
  const isCharged = view !== "none" && view !== "ended" && view !== "refunding";
  return {
    planName: entitlements.planName,
    view,
    badge: subscriptionBadgeLabel(view),
    price: isCharged && price ? { amount: formatMoney(price.amountCents, price.currency), suffix: formatIntervalSuffix(price.interval) } : null,
    date: buildDateFact(entitlements, subscription),
    notice: buildNotice(subscription),
  };
}
