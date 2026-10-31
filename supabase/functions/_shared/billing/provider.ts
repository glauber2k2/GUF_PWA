// Contrato do gateway de pagamento. Nada fora de `providers/<gateway>/` conhece o Stripe (ou outro):
// os serviços e as Edge Functions falam só com estes tipos normalizados.
// Gateway novo = um adaptador que implementa BillingProvider + uma entrada em BILLING_PROVIDERS (registry.ts).

/** Gateways que o banco aceita (`provider` nas tabelas de cobrança). */
export type ProviderId = "stripe";

/** Situação da assinatura no guf (check de `subscriptions.status`). */
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export type BillingInterval = "month" | "year";

export interface ProviderPrice {
  ref: string;
  amountCents: number;
  currency: string;
  interval: BillingInterval | null;
  isActive: boolean;
}

export interface ProviderSubscription {
  ref: string;
  customerRef: string;
  priceRef: string;
  /** null = ainda sem pagamento (ex.: aguardando o 1º pagamento): não vira assinatura no guf. */
  status: SubscriptionStatus | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  /** O que se reembolsa do pagamento mais recente (usado ao desfazer uma assinatura duplicada). */
  latestPaymentRef: string | null;
}

export interface ProviderPayment {
  /** Fatura (única por cobrança). */
  ref: string;
  customerRef: string;
  subscriptionRef: string | null;
  /** O que se reembolsa (no Stripe, o PaymentIntent). */
  paymentRef: string | null;
  amountCents: number;
  currency: string;
  paidAt: string | null;
  isPaid: boolean;
}

export type ProviderRefundStatus = "succeeded" | "pending" | "failed";

export interface ProviderRefund {
  ref: string;
  amountCents: number;
  status: ProviderRefundStatus;
  /** Id do `billing_refunds` quando o reembolso foi pedido pelo guf (null = feito fora do app). */
  gufRefundId: string | null;
  /** Origem marcada pelo guf em reembolsos sem linha prévia (ex.: "duplicate"). */
  gufOrigin: string | null;
}

export interface ProviderRefundState {
  paymentRef: string;
  /** Total já devolvido do pagamento (absoluto). */
  refundedCents: number;
  refunds: ProviderRefund[];
}

/** Evento do webhook já conferido e normalizado. `ref` é opaco: só o mesmo adaptador o entende. */
export type BillingEventPayload =
  | { kind: "subscription_changed"; subscriptionRef: string }
  | { kind: "payment_succeeded"; paymentRef: string }
  | { kind: "refund_changed"; ref: string }
  | { kind: "payment_disputed"; paymentRef: string }
  | { kind: "ignored" };

export type BillingEvent = { id: string; type: string } & BillingEventPayload;

export interface CreateCheckoutInput {
  customerRef: string;
  priceRef: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface RefundInput {
  paymentRef: string;
  /** null = o valor inteiro que ainda não foi devolvido. */
  amountCents: number | null;
  /** Mesmo pedido repetido = mesmo reembolso (nunca devolve duas vezes). */
  idempotencyKey: string;
  gufRefundId: string | null;
  gufOrigin: string;
}

export interface RefundResult {
  ref: string;
  status: ProviderRefundStatus;
}

/** Contratar: cliente, preço e página de pagamento hospedada pelo gateway. */
export interface CheckoutGateway {
  createCustomer(input: { userId: string; email: string | null }): Promise<string>;
  getPrice(priceRef: string): Promise<ProviderPrice>;
  /** Encerra páginas de pagamento ainda abertas (duas abas = duas assinaturas). */
  expireOpenCheckouts(customerRef: string): Promise<void>;
  createCheckout(input: CreateCheckoutInput): Promise<{ url: string }>;
}

export interface SubscriptionGateway {
  getSubscription(subscriptionRef: string): Promise<ProviderSubscription>;
  setCancelAtPeriodEnd(subscriptionRef: string, cancel: boolean): Promise<void>;
  /** Encerra agora, sem cobrança proporcional. Já encerrada = sucesso. */
  cancelNow(subscriptionRef: string): Promise<void>;
}

export interface PaymentGateway {
  getPayment(paymentRef: string): Promise<ProviderPayment>;
  getRefundState(ref: string): Promise<ProviderRefundState>;
  refund(input: RefundInput): Promise<RefundResult>;
}

/** Trocar cartão e ver faturas (sem cancelar: o cancelamento passa pela regra dos 7 dias no app). */
export interface PortalGateway {
  createPortalSession(input: { customerRef: string; returnUrl: string }): Promise<{ url: string }>;
}

export interface WebhookGateway {
  /** Confere a assinatura do evento; lança `InvalidWebhookError` se não for do gateway. */
  parseEvent(rawBody: string, headers: Headers): Promise<BillingEvent>;
}

export interface BillingProvider extends CheckoutGateway, SubscriptionGateway, PaymentGateway, PortalGateway, WebhookGateway {
  readonly id: ProviderId;
}

/** Assinatura do webhook ausente, velha ou que não confere. */
export class InvalidWebhookError extends Error {}

/** Gateway sem configuração (secrets ausentes): a venda fica indisponível. */
export class BillingConfigError extends Error {}

/** O gateway recusou ou não respondeu. */
export class ProviderRequestError extends Error {
  constructor(message: string, readonly status: number, readonly providerCode: string | null) {
    super(message);
  }
}
