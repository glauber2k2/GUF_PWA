import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";
import type {
  BillingInterval,
  BillingPayment,
  BillingRefund,
  BillingSubscription,
  CancellationOutcome,
  MyBilling,
  PaymentStatus,
  PlanPrice,
  RefundStatus,
  SubscriptionStatus,
} from "@guf/core";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiError, type ApiErrorCode, type ApiResult } from "./result";

/* =====================================================================
 * Contrato — assinatura paga. SÓ ONLINE.
 * O app nunca libera nem encerra o Pro: pede à Edge Function `billing` (que fala com o gateway) e lê
 * o resultado no banco (`my_billing`, `my_entitlements`). O Pro nasce e acaba pelo webhook.
 * ===================================================================== */

type Result<T> = Promise<ApiResult<T>>;

export interface BillingApi {
  /** Preços à venda (mostrados antes de assinar). */
  getPlanPrices: (client: GufClient, input: null) => Result<PlanPrice[]>;
  /** Assinatura, prazo de desistência, pagamentos e devoluções do próprio usuário. */
  getMyBilling: (client: GufClient, input: null) => Result<MyBilling>;
  /** Cancela: dentro dos 7 dias devolve tudo e encerra agora; depois, vale até o fim do período. */
  cancelSubscription: (client: GufClient, input: { subscriptionId: string }) => Result<CancellationOutcome>;
  /** Desfaz o cancelamento agendado. */
  reactivateSubscription: (client: GufClient, input: { subscriptionId: string }) => Result<null>;
  /** Endereço do portal do gateway (trocar cartão, ver faturas). */
  openBillingPortal: (client: GufClient, input: null) => Result<{ url: string }>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const BILLING_FUNCTION = "billing";

/** Códigos devolvidos pela Edge Function → códigos do app. */
const BILLING_ERROR_CODES: Record<string, ApiErrorCode> = {
  billing_unavailable: "billing_unavailable",
  billing_provider_error: "billing_provider_error",
  subscription_not_found: "subscription_not_found",
  subscription_already_active: "subscription_already_active",
  subscription_documents_outdated: "subscription_documents_outdated",
  account_suspended: "account_suspended",
  not_authenticated: "not_authenticated",
};

async function toBillingError(error: unknown): Promise<ApiError> {
  if (error instanceof FunctionsHttpError) {
    const body = (await (error.context as Response).json().catch(() => null)) as { code?: string } | null;
    return apiError(BILLING_ERROR_CODES[body?.code ?? ""] ?? "unknown");
  }
  if (error instanceof FunctionsFetchError) return apiError("network_error");
  return toApiError(error);
}

/** Chama uma ação da Edge Function `billing` (o token da sessão vai junto: ela confere quem pede). */
export async function invokeBilling<T>(client: GufClient, body: Record<string, unknown>): Result<T> {
  try {
    const { data, error } = await client.functions.invoke<T>(BILLING_FUNCTION, { body });
    if (error) return { data: null, error: await toBillingError(error) };
    return { data: data as T, error: null };
  } catch (e) {
    return { data: null, error: await toBillingError(e) };
  }
}

/** Só segue para endereços https (página do gateway); qualquer outra coisa é tratada como falha. */
export function isSafeRedirectUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

interface MyBillingJson {
  subscription: {
    id: string;
    plan_code: string;
    plan_name: string;
    status: SubscriptionStatus;
    started_at: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    withdrawal_ends_at: string | null;
    can_withdraw: boolean;
    withdrawal_refund_cents: number;
    has_processing_refund: boolean;
    can_manage_payment: boolean;
  } | null;
  payments: { id: string; amount_cents: number; refunded_cents: number; currency: string; status: PaymentStatus; paid_at: string }[];
  refunds: { id: string; payment_id: string; amount_cents: number; status: RefundStatus; origin: string; created_at: string }[];
}

function toSubscription(json: NonNullable<MyBillingJson["subscription"]>): BillingSubscription {
  return {
    id: json.id,
    planCode: json.plan_code,
    planName: json.plan_name,
    status: json.status,
    startedAt: json.started_at,
    currentPeriodEnd: json.current_period_end,
    cancelAtPeriodEnd: json.cancel_at_period_end,
    canceledAt: json.canceled_at,
    withdrawalEndsAt: json.withdrawal_ends_at,
    canWithdraw: json.can_withdraw,
    withdrawalRefundCents: json.withdrawal_refund_cents,
    hasProcessingRefund: json.has_processing_refund,
    canManagePayment: json.can_manage_payment,
  };
}

export const getPlanPrices: BillingApi["getPlanPrices"] = async (client) => {
  try {
    const { data, error } = await client.from("plan_prices").select("plan_code, billing_interval, amount_cents, currency").order("amount_cents");
    if (error) return { data: null, error: toApiError(error) };
    return {
      data: data.map((row) => ({
        planCode: row.plan_code,
        interval: row.billing_interval as BillingInterval,
        amountCents: row.amount_cents,
        currency: row.currency,
      })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getMyBilling: BillingApi["getMyBilling"] = async (client) => {
  try {
    const { data, error } = await client.rpc("my_billing");
    if (error) return { data: null, error: toApiError(error) };
    const json = data as unknown as MyBillingJson;
    return {
      data: {
        subscription: json.subscription ? toSubscription(json.subscription) : null,
        payments: json.payments.map<BillingPayment>((p) => ({
          id: p.id,
          amountCents: p.amount_cents,
          refundedCents: p.refunded_cents,
          currency: p.currency,
          status: p.status,
          paidAt: p.paid_at,
        })),
        refunds: json.refunds.map<BillingRefund>((r) => ({
          id: r.id,
          paymentId: r.payment_id,
          amountCents: r.amount_cents,
          status: r.status,
          origin: r.origin,
          createdAt: r.created_at,
        })),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const cancelSubscription: BillingApi["cancelSubscription"] = (client, { subscriptionId }) =>
  invokeBilling<CancellationOutcome>(client, { action: "cancel", subscriptionId });

export const reactivateSubscription: BillingApi["reactivateSubscription"] = async (client, { subscriptionId }) => {
  const { error } = await invokeBilling<{ ok: true }>(client, { action: "reactivate", subscriptionId });
  return error ? { data: null, error } : { data: null, error: null };
};

export const openBillingPortal: BillingApi["openBillingPortal"] = async (client) => {
  const { data, error } = await invokeBilling<{ url: string }>(client, { action: "portal" });
  if (error) return { data: null, error };
  if (!isSafeRedirectUrl(data.url)) return { data: null, error: apiError("billing_provider_error") };
  return { data: { url: data.url }, error: null };
};

export const billingApi = {
  getPlanPrices,
  getMyBilling,
  cancelSubscription,
  reactivateSubscription,
  openBillingPortal,
} satisfies BillingApi;
