// Assinatura do Google Play (purchases.subscriptionsv2) → tipos normalizados do guf. Funções puras.
// Referência: https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.subscriptionsv2
import type { ProviderPayment, ProviderSubscription, SubscriptionStatus } from "../../provider.ts";

interface PlayMoney {
  currencyCode: string;
  units?: string;
  nanos?: number;
}

export interface PlaySubscriptionV2 {
  subscriptionState: string;
  acknowledgementState?: string;
  latestOrderId?: string;
  startTime?: string;
  lineItems?: Array<{
    productId: string;
    expiryTime?: string;
    latestSuccessfulOrderId?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean; recurringPrice?: PlayMoney };
  }>;
}

/** Situações em que a pessoa ainda tem o Pro (ou o Google ainda tenta cobrar). */
const STATUS_BY_STATE: Record<string, SubscriptionStatus | null> = {
  SUBSCRIPTION_STATE_ACTIVE: "active",
  SUBSCRIPTION_STATE_IN_GRACE_PERIOD: "past_due",
  // Em espera ou pausada: sem acesso; se o pagamento voltar, o aviso RECOVERED religa.
  SUBSCRIPTION_STATE_ON_HOLD: "expired",
  SUBSCRIPTION_STATE_PAUSED: "expired",
  SUBSCRIPTION_STATE_EXPIRED: "expired",
  // Ainda sem pagamento: não vira assinatura no guf.
  SUBSCRIPTION_STATE_PENDING: null,
  SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: null,
};

const CANCELED_STATE = "SUBSCRIPTION_STATE_CANCELED";
const ACKNOWLEDGED_STATE = "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED";

function mainLineItem(subscription: PlaySubscriptionV2) {
  const item = subscription.lineItems?.[0];
  if (!item) throw new Error("Assinatura do Google Play sem produto");
  return item;
}

/** Cancelada pela pessoa mantém o acesso até o fim do período (como o "cancelar no fim" do Stripe). */
function toStatus(subscription: PlaySubscriptionV2, expiryTime: string | null, now: Date): SubscriptionStatus | null {
  if (subscription.subscriptionState === CANCELED_STATE) {
    return expiryTime && new Date(expiryTime) > now ? "active" : "canceled";
  }
  return STATUS_BY_STATE[subscription.subscriptionState] ?? null;
}

/** "29.90" do Google (units + nanos) → centavos. */
export function playMoneyToCents(money: PlayMoney): number {
  return Number(money.units ?? "0") * 100 + Math.round((money.nanos ?? 0) / 10_000_000);
}

export function productIdOf(subscription: PlaySubscriptionV2): string {
  return mainLineItem(subscription).productId;
}

export function isAcknowledged(subscription: PlaySubscriptionV2): boolean {
  return subscription.acknowledgementState === ACKNOWLEDGED_STATE;
}

/** Último pedido pago (o que se devolve na desistência). */
export function latestOrderIdOf(subscription: PlaySubscriptionV2): string | null {
  return mainLineItem(subscription).latestSuccessfulOrderId ?? subscription.latestOrderId ?? null;
}

/**
 * O dono não vem do Google: a compra é ligada à pessoa no banco (billing_purchase_links) quando ela
 * confirma no app. Por isso `customerRef` fica vazio e o banco procura pelo token da compra.
 */
export function toProviderSubscription(purchaseToken: string, subscription: PlaySubscriptionV2, now = new Date()): ProviderSubscription {
  const item = mainLineItem(subscription);
  const expiryTime = item.expiryTime ?? null;
  const renewsAutomatically = item.autoRenewingPlan?.autoRenewEnabled ?? false;
  return {
    ref: purchaseToken,
    customerRef: "",
    priceRef: item.productId,
    status: toStatus(subscription, expiryTime, now),
    currentPeriodEnd: expiryTime,
    cancelAtPeriodEnd: subscription.subscriptionState === CANCELED_STATE || !renewsAutomatically,
    canceledAt: null,
    latestPaymentRef: latestOrderIdOf(subscription),
  };
}

/**
 * Pagamento mais recente da assinatura. O Google não informa a hora do pedido nesta API: vale a hora
 * em que o guf registrou (o aviso chega em segundos; na compra, é confirmado na hora).
 */
export function toProviderPayment(purchaseToken: string, subscription: PlaySubscriptionV2, now = new Date()): ProviderPayment {
  const item = mainLineItem(subscription);
  const orderId = latestOrderIdOf(subscription);
  const price = item.autoRenewingPlan?.recurringPrice;
  const hasAccess = toStatus(subscription, item.expiryTime ?? null, now) !== null;
  return {
    ref: orderId ?? purchaseToken,
    customerRef: "",
    subscriptionRef: purchaseToken,
    paymentRef: orderId,
    amountCents: price ? playMoneyToCents(price) : 0,
    currency: (price?.currencyCode ?? "brl").toLowerCase(),
    paidAt: now.toISOString(),
    isPaid: Boolean(orderId && price && hasAccess),
  };
}
