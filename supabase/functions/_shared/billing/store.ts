// Acesso ao banco das funções de cobrança (service_role). Os serviços dependem da interface
// BillingStore, nunca do cliente Supabase (nos testes, um store em memória).
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { ProviderId, ProviderPayment, ProviderRefundState, ProviderSubscription, SubscriptionStatus } from "./provider.ts";

/** Erro do banco com o código (GB001, GB004…) para a Edge Function traduzir. */
export class BillingStoreError extends Error {
  constructor(message: string, readonly code: string | null) {
    super(message);
  }
}

export interface CheckoutContext {
  priceRef: string;
  amountCents: number;
  currency: string;
  interval: "month" | "year";
  customerRef: string | null;
}

export type SyncOutcome =
  | { outcome: "unknown_customer" }
  | { outcome: "duplicate"; userId: string }
  | { outcome: "synced"; userId: string; subscriptionId: string; wasLive: boolean; isLive: boolean };

export interface PlannedRefund {
  id: string;
  paymentRef: string;
  amountCents: number;
}

export interface CancellationPlan {
  mode: "refund_and_end" | "end_now" | "end_at_period_end";
  provider: ProviderId;
  subscriptionRef: string;
  refunds: PlannedRefund[];
}

export interface RefundsOutcome {
  outcome: "recorded" | "unknown_payment";
  userId: string | null;
  newOutsideRefund: boolean;
  fullyRefunded: boolean;
  subscriptionRef: string | null;
  subscriptionLive: boolean;
  isLatestPayment: boolean;
}

export interface LiveSubscription {
  id: string;
  provider: ProviderId;
  providerRef: string;
}

export interface OwnedSubscription {
  id: string;
  provider: ProviderId;
  providerRef: string;
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
}

export interface BillingStore {
  beginEvent(provider: ProviderId, eventId: string, type: string): Promise<boolean>;
  finishEvent(provider: ProviderId, eventId: string, errorCode: string | null): Promise<void>;
  checkoutContext(userId: string, planCode: string, provider: ProviderId): Promise<CheckoutContext>;
  linkCustomer(userId: string, provider: ProviderId, customerRef: string): Promise<string>;
  customerOf(userId: string, provider: ProviderId): Promise<string | null>;
  syncSubscription(provider: ProviderId, subscription: ProviderSubscription & { status: SubscriptionStatus }): Promise<SyncOutcome>;
  recordPayment(provider: ProviderId, payment: ProviderPayment & { paidAt: string }): Promise<void>;
  beginCancellation(userId: string, subscriptionId: string, origin: "withdrawal" | "account_deletion"): Promise<CancellationPlan>;
  markRefund(refundId: string, status: "processing" | "refunded" | "failed", providerRefundRef: string | null): Promise<void>;
  recordRefunds(provider: ProviderId, state: ProviderRefundState): Promise<RefundsOutcome>;
  recordDispute(provider: ProviderId, paymentRef: string): Promise<{ userId: string | null; subscriptionRef: string | null }>;
  liveSubscriptions(userId: string): Promise<LiveSubscription[]>;
  ownedSubscription(userId: string, subscriptionId: string): Promise<OwnedSubscription | null>;
  /** Aviso dirigido no app (comunicado de serviço, até 160 caracteres). */
  notifyUser(userId: string, title: string, body: string): Promise<void>;
}

type Json = Record<string, unknown>;

export function createSupabaseBillingStore(admin: SupabaseClient): BillingStore {
  async function rpc<T>(name: string, args: Json): Promise<T> {
    const { data, error } = await admin.rpc(name, args);
    if (error) throw new BillingStoreError(`${name}: ${error.message}`, error.code ?? null);
    return data as T;
  }

  return {
    beginEvent: (provider, eventId, type) => rpc<boolean>("billing_event_begin", { p_provider: provider, p_event_id: eventId, p_type: type }),

    async finishEvent(provider, eventId, errorCode) {
      await rpc("billing_event_finish", { p_provider: provider, p_event_id: eventId, p_error_code: errorCode });
    },

    async checkoutContext(userId, planCode, provider) {
      const json = await rpc<Json>("billing_checkout_context", { p_user_id: userId, p_plan_code: planCode, p_provider: provider });
      return {
        priceRef: json.price_ref as string,
        amountCents: json.amount_cents as number,
        currency: json.currency as string,
        interval: json.billing_interval as "month" | "year",
        customerRef: (json.customer_ref as string | null) ?? null,
      };
    },

    linkCustomer: (userId, provider, customerRef) =>
      rpc<string>("billing_link_customer", { p_user_id: userId, p_provider: provider, p_customer_ref: customerRef }),

    async customerOf(userId, provider) {
      const { data, error } = await admin
        .from("billing_customers")
        .select("customer_ref")
        .eq("user_id", userId)
        .eq("provider", provider)
        .maybeSingle();
      if (error) throw new BillingStoreError(error.message, error.code ?? null);
      return data?.customer_ref ?? null;
    },

    async syncSubscription(provider, subscription) {
      const json = await rpc<Json>("billing_sync_subscription", {
        p_provider: provider,
        p_customer_ref: subscription.customerRef,
        p_provider_ref: subscription.ref,
        p_price_ref: subscription.priceRef,
        p_status: subscription.status,
        p_current_period_end: subscription.currentPeriodEnd,
        p_cancel_at_period_end: subscription.cancelAtPeriodEnd,
        p_canceled_at: subscription.canceledAt,
      });
      if (json.outcome === "unknown_customer") return { outcome: "unknown_customer" };
      if (json.outcome === "duplicate") return { outcome: "duplicate", userId: json.user_id as string };
      return {
        outcome: "synced",
        userId: json.user_id as string,
        subscriptionId: json.subscription_id as string,
        wasLive: Boolean(json.was_live),
        isLive: Boolean(json.is_live),
      };
    },

    async recordPayment(provider, payment) {
      await rpc("billing_record_payment", {
        p_provider: provider,
        p_customer_ref: payment.customerRef,
        p_subscription_ref: payment.subscriptionRef,
        p_provider_ref: payment.ref,
        p_payment_ref: payment.paymentRef,
        p_amount_cents: payment.amountCents,
        p_currency: payment.currency,
        p_paid_at: payment.paidAt,
      });
    },

    async beginCancellation(userId, subscriptionId, origin) {
      const json = await rpc<Json>("billing_begin_cancellation", { p_user_id: userId, p_subscription_id: subscriptionId, p_origin: origin });
      const refunds = (json.refunds as Json[] | null) ?? [];
      return {
        mode: json.mode as CancellationPlan["mode"],
        provider: json.provider as ProviderId,
        subscriptionRef: json.subscription_ref as string,
        refunds: refunds.map((refund) => ({
          id: refund.id as string,
          paymentRef: refund.payment_ref as string,
          amountCents: refund.amount_cents as number,
        })),
      };
    },

    async markRefund(refundId, status, providerRefundRef) {
      await rpc("billing_mark_refund", { p_refund_id: refundId, p_status: status, p_provider_refund_ref: providerRefundRef });
    },

    async recordRefunds(provider, state) {
      const json = await rpc<Json>("billing_record_refunds", {
        p_provider: provider,
        p_payment_ref: state.paymentRef,
        p_refunded_cents: state.refundedCents,
        p_refunds: state.refunds.map((refund) => ({
          ref: refund.ref,
          amount_cents: refund.amountCents,
          status: refund.status,
          guf_refund_id: refund.gufRefundId ?? "",
          origin: refund.gufOrigin ?? "",
        })),
      });
      return {
        outcome: json.outcome as RefundsOutcome["outcome"],
        userId: (json.user_id as string | null) ?? null,
        newOutsideRefund: Boolean(json.new_outside_refund),
        fullyRefunded: Boolean(json.fully_refunded),
        subscriptionRef: (json.subscription_ref as string | null) ?? null,
        subscriptionLive: Boolean(json.subscription_live),
        isLatestPayment: Boolean(json.is_latest_payment),
      };
    },

    async recordDispute(provider, paymentRef) {
      const json = await rpc<Json>("billing_record_dispute", { p_provider: provider, p_payment_ref: paymentRef });
      return { userId: (json.user_id as string | null) ?? null, subscriptionRef: (json.subscription_ref as string | null) ?? null };
    },

    async liveSubscriptions(userId) {
      const rows = await rpc<{ id: string; provider: ProviderId; provider_ref: string }[]>("billing_live_subscriptions", { p_user_id: userId });
      return rows.map((row) => ({ id: row.id, provider: row.provider, providerRef: row.provider_ref }));
    },

    async ownedSubscription(userId, subscriptionId) {
      const { data, error } = await admin
        .from("subscriptions")
        .select("id, provider, provider_ref, status, cancel_at_period_end")
        .eq("id", subscriptionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new BillingStoreError(error.message, error.code ?? null);
      if (!data) return null;
      return {
        id: data.id,
        provider: data.provider as ProviderId,
        providerRef: data.provider_ref,
        status: data.status as SubscriptionStatus,
        cancelAtPeriodEnd: data.cancel_at_period_end,
      };
    },

    async notifyUser(userId, title, body) {
      await rpc("notify_account_change", { p_user_id: userId, p_title: title, p_body: body });
    },
  };
}
