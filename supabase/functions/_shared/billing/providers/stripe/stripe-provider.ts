// Adaptador do Stripe: único arquivo (com stripe-client/stripe-webhook) que conhece o formato do Stripe.
import {
  BillingConfigError,
  ProviderRequestError,
  type BillingEventPayload,
  type BillingProvider,
  type ProviderRefundStatus,
  type SubscriptionStatus,
} from "../../provider.ts";
import { createStripeClient, type StripeClient } from "./stripe-client.ts";
import { verifyStripeSignature } from "./stripe-webhook.ts";

/** Mínimo exigido pelo Stripe para `expires_at` da página de pagamento. */
const CHECKOUT_EXPIRES_SECONDS = 31 * 60;

interface StripeList<T> {
  data: T[];
}

interface StripePrice {
  id: string;
  active: boolean;
  unit_amount: number | null;
  currency: string;
  recurring: { interval: string } | null;
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  items: { data: { price: { id: string } }[] };
  latest_invoice: { payment_intent: string | null } | string | null;
}

interface StripeInvoice {
  id: string;
  customer: string;
  subscription: string | null;
  payment_intent: string | null;
  amount_paid: number;
  currency: string;
  status: string;
  status_transitions: { paid_at: number | null };
}

interface StripeRefund {
  id: string;
  amount: number;
  status: string;
  metadata: Record<string, string> | null;
}

interface StripeCharge {
  id: string;
  payment_intent: string | null;
  amount_refunded: number;
  refunds: StripeList<StripeRefund> | null;
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

/** Situação do Stripe → situação do guf (null = ainda não paga: o guf ignora). */
const SUBSCRIPTION_STATUS: Record<string, SubscriptionStatus | null> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "expired",
  incomplete_expired: "expired",
  paused: "expired",
  incomplete: null,
};

const REFUND_STATUS: Record<string, ProviderRefundStatus> = {
  succeeded: "succeeded",
  pending: "pending",
  requires_action: "pending",
};

const toIso = (unixSeconds: number | null): string | null => (unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null);

const stringField = (object: Record<string, unknown>, key: string): string | null =>
  typeof object[key] === "string" && object[key] ? (object[key] as string) : null;

/**
 * Assinatura da fatura no formato das versões da API a partir de 2025-03-31, onde `invoice.subscription` saiu:
 * o aviso vem na versão escolhida no endpoint do webhook, não na fixada em `STRIPE_API_VERSION`.
 */
function invoiceParentSubscription(object: Record<string, unknown>): string | null {
  const parent = object.parent as { subscription_details?: { subscription?: unknown } } | null | undefined;
  const subscription = parent?.subscription_details?.subscription;
  return typeof subscription === "string" && subscription ? subscription : null;
}

/** Tipos de evento do Stripe → evento normalizado (aberto/fechado: evento novo = uma entrada). */
const EVENT_MAPPERS: Record<string, (object: Record<string, unknown>) => BillingEventPayload | null> = {
  "checkout.session.completed": (object) => {
    const subscriptionRef = stringField(object, "subscription");
    return subscriptionRef ? { kind: "subscription_changed", subscriptionRef } : null;
  },
  "customer.subscription.created": (object) => ({ kind: "subscription_changed", subscriptionRef: object.id as string }),
  "customer.subscription.updated": (object) => ({ kind: "subscription_changed", subscriptionRef: object.id as string }),
  "customer.subscription.deleted": (object) => ({ kind: "subscription_changed", subscriptionRef: object.id as string }),
  "invoice.paid": (object) => ({ kind: "payment_succeeded", paymentRef: object.id as string }),
  "invoice.payment_failed": (object) => {
    const subscriptionRef = stringField(object, "subscription") ?? invoiceParentSubscription(object);
    return subscriptionRef ? { kind: "subscription_changed", subscriptionRef } : null;
  },
  "charge.refunded": (object) => ({ kind: "refund_changed", ref: object.id as string }),
  "charge.refund.updated": (object) => {
    const charge = stringField(object, "charge");
    return charge ? { kind: "refund_changed", ref: charge } : null;
  },
  "refund.updated": (object) => {
    const charge = stringField(object, "charge");
    return charge ? { kind: "refund_changed", ref: charge } : null;
  },
  "charge.dispute.created": (object) => {
    const paymentRef = stringField(object, "payment_intent");
    return paymentRef ? { kind: "payment_disputed", paymentRef } : null;
  },
};

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new BillingConfigError(`Secret ${name} ausente`);
  return value;
}

/** Monta o adaptador com os secrets da Edge Function. */
export function createStripeProvider(): BillingProvider {
  const stripe: StripeClient = createStripeClient(requireEnv("STRIPE_SECRET_KEY"));
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? null;
  const portalConfiguration = Deno.env.get("STRIPE_PORTAL_CONFIGURATION") ?? undefined;

  return {
    id: "stripe",

    async createCustomer({ userId, email }) {
      // Mesma chave por pessoa: duas chamadas ao mesmo tempo criam um cliente só.
      const customer = await stripe.post<{ id: string }>(
        "/customers",
        { email: email ?? undefined, metadata: { user_id: userId } },
        { idempotencyKey: `guf-customer-${userId}` },
      );
      return customer.id;
    },

    async getPrice(priceRef) {
      const price = await stripe.get<StripePrice>(`/prices/${encodeURIComponent(priceRef)}`);
      const interval = price.recurring?.interval;
      return {
        ref: price.id,
        amountCents: price.unit_amount ?? 0,
        currency: price.currency,
        interval: interval === "month" || interval === "year" ? interval : null,
        isActive: price.active,
      };
    },

    async expireOpenCheckouts(customerRef) {
      const open = await stripe.get<StripeList<{ id: string }>>("/checkout/sessions", { customer: customerRef, status: "open", limit: 10 });
      await Promise.all(open.data.map((session) => stripe.post(`/checkout/sessions/${session.id}/expire`)));
    },

    async createCheckout({ customerRef, priceRef, userId, successUrl, cancelUrl }) {
      const session = await stripe.post<{ url: string | null }>("/checkout/sessions", {
        mode: "subscription",
        customer: customerRef,
        client_reference_id: userId,
        line_items: [{ price: priceRef, quantity: 1 }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        locale: "pt-BR",
        allow_promotion_codes: false,
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_EXPIRES_SECONDS,
        metadata: { user_id: userId },
        subscription_data: { metadata: { user_id: userId } },
      });
      if (!session.url) throw new ProviderRequestError("Página de pagamento sem endereço", 502, null);
      return { url: session.url };
    },

    async getSubscription(subscriptionRef) {
      const subscription = await stripe.get<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionRef)}`, {
        expand: ["latest_invoice"],
      });
      const latestInvoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
      return {
        ref: subscription.id,
        customerRef: subscription.customer,
        priceRef: subscription.items.data[0]?.price.id ?? "",
        status: SUBSCRIPTION_STATUS[subscription.status] ?? null,
        currentPeriodEnd: toIso(subscription.current_period_end),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: toIso(subscription.canceled_at),
        latestPaymentRef: latestInvoice?.payment_intent ?? null,
      };
    },

    async setCancelAtPeriodEnd(subscriptionRef, cancel) {
      await stripe.post(`/subscriptions/${encodeURIComponent(subscriptionRef)}`, { cancel_at_period_end: cancel });
    },

    async cancelNow(subscriptionRef) {
      try {
        await stripe.del(`/subscriptions/${encodeURIComponent(subscriptionRef)}`, { prorate: false, invoice_now: false });
      } catch (error) {
        // Já cancelada: o objetivo (não cobrar mais) está cumprido.
        const alreadyCanceled = error instanceof ProviderRequestError && error.status === 404;
        if (!alreadyCanceled) throw error;
        const current = await stripe.get<StripeSubscription>(`/subscriptions/${encodeURIComponent(subscriptionRef)}`);
        if (current.status !== "canceled") throw error;
      }
    },

    async getPayment(paymentRef) {
      const invoice = await stripe.get<StripeInvoice>(`/invoices/${encodeURIComponent(paymentRef)}`);
      return {
        ref: invoice.id,
        customerRef: invoice.customer,
        subscriptionRef: invoice.subscription,
        paymentRef: invoice.payment_intent,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        paidAt: toIso(invoice.status_transitions.paid_at),
        isPaid: invoice.status === "paid",
      };
    },

    async getRefundState(ref) {
      const charge = await stripe.get<StripeCharge>(`/charges/${encodeURIComponent(ref)}`, { expand: ["refunds"] });
      return {
        paymentRef: charge.payment_intent ?? "",
        refundedCents: charge.amount_refunded,
        refunds: (charge.refunds?.data ?? []).map((refund) => ({
          ref: refund.id,
          amountCents: refund.amount,
          status: REFUND_STATUS[refund.status] ?? "failed",
          gufRefundId: refund.metadata?.guf_refund_id || null,
          gufOrigin: refund.metadata?.guf_origin || null,
        })),
      };
    },

    async refund({ paymentRef, amountCents, idempotencyKey, gufRefundId, gufOrigin }) {
      const refund = await stripe.post<StripeRefund>(
        "/refunds",
        {
          payment_intent: paymentRef,
          amount: amountCents ?? undefined,
          reason: "requested_by_customer",
          metadata: { guf_refund_id: gufRefundId ?? undefined, guf_origin: gufOrigin },
        },
        { idempotencyKey: `guf-refund-${idempotencyKey}` },
      );
      return { ref: refund.id, status: REFUND_STATUS[refund.status] ?? "failed" };
    },

    async createPortalSession({ customerRef, returnUrl }) {
      const session = await stripe.post<{ url: string }>("/billing_portal/sessions", {
        customer: customerRef,
        return_url: returnUrl,
        configuration: portalConfiguration,
        locale: "pt-BR",
      });
      return { url: session.url };
    },

    async parseEvent(rawBody, headers) {
      if (!webhookSecret) throw new BillingConfigError("Secret STRIPE_WEBHOOK_SECRET ausente");
      await verifyStripeSignature(rawBody, headers.get("Stripe-Signature"), webhookSecret);
      const event = JSON.parse(rawBody) as StripeEvent;
      const mapped = EVENT_MAPPERS[event.type]?.(event.data.object) ?? null;
      const payload: BillingEventPayload = mapped ?? { kind: "ignored" };
      return { id: event.id, type: event.type, ...payload };
    },
  };
}
