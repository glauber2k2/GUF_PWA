/**
 * MOCK da assinatura paga — mesmo contrato de @guf/api (BillingApi). Só em desenvolvimento com ?estado=:
 * (nenhum) sem assinatura · assinante-7dias · assinante · cancelada · atraso · reembolsando · reembolsada.
 * Com Pro na tela de planos: junte `pro` (ex.: /planos?estado=assinante-7dias,pro).
 * Os dados são montados sob demanda (nada roda ao carregar o módulo, para o build descartar o mock).
 */
import { apiError, type BillingApi, type GufClient } from "@guf/api";
import type { BillingSubscription, MyBilling } from "@guf/core";

export type BillingMockScenario = "none" | "assinante-7dias" | "assinante" | "cancelada" | "atraso" | "reembolsando" | "reembolsada";

export const BILLING_MOCK_SCENARIOS: readonly BillingMockScenario[] = [
  "assinante-7dias",
  "assinante",
  "cancelada",
  "atraso",
  "reembolsando",
  "reembolsada",
];

const LATENCY_MS = 350;
const DAY_MS = 86_400_000;
const PRICE_CENTS = 1990;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

let scenario: BillingMockScenario = "none";

export function setBillingMockScenario(next: BillingMockScenario) {
  scenario = next;
}

function ignoreClient(client: GufClient) {
  void client;
}

const daysFromNow = (days: number) => new Date(Date.now() + days * DAY_MS).toISOString();

function buildSubscription(): BillingSubscription | null {
  if (scenario === "none") return null;
  const startedDaysAgo = scenario === "assinante-7dias" || scenario === "reembolsando" || scenario === "reembolsada" ? 2 : 40;
  const canWithdraw = scenario === "assinante-7dias";
  return {
    id: "00000000-0000-4000-8000-0000000000b1",
    planCode: "pro",
    planName: "Pro",
    status: scenario === "atraso" ? "past_due" : scenario === "reembolsando" || scenario === "reembolsada" ? "canceled" : "active",
    startedAt: daysFromNow(-startedDaysAgo),
    currentPeriodEnd: daysFromNow(30 - (startedDaysAgo % 30)),
    cancelAtPeriodEnd: scenario === "cancelada",
    canceledAt: scenario === "reembolsando" || scenario === "reembolsada" ? daysFromNow(0) : null,
    withdrawalEndsAt: daysFromNow(7 - startedDaysAgo),
    canWithdraw,
    withdrawalRefundCents: canWithdraw ? PRICE_CENTS : 0,
    hasProcessingRefund: scenario === "reembolsando",
    canManagePayment: true,
  };
}

function buildBilling(): MyBilling {
  const subscription = buildSubscription();
  if (!subscription) return { subscription: null, payments: [], refunds: [] };
  const refunded = scenario === "reembolsada";
  return {
    subscription,
    payments: [
      {
        id: "pay-1",
        amountCents: PRICE_CENTS,
        refundedCents: refunded ? PRICE_CENTS : 0,
        currency: "brl",
        status: refunded ? "refunded" : "paid",
        paidAt: subscription.startedAt ?? daysFromNow(0),
      },
    ],
    refunds:
      scenario === "reembolsando" || refunded
        ? [{ id: "ref-1", paymentId: "pay-1", amountCents: PRICE_CENTS, status: refunded ? "refunded" : "processing", origin: "withdrawal", createdAt: daysFromNow(0) }]
        : [],
  };
}

export const mockBillingApi = {
  async getPlanPrices(client) {
    ignoreClient(client);
    await wait();
    return { data: [{ planCode: "pro", interval: "month", amountCents: PRICE_CENTS, currency: "brl" }], error: null };
  },
  async getMyBilling(client) {
    ignoreClient(client);
    await wait();
    return { data: buildBilling(), error: null };
  },
  async cancelSubscription(client) {
    ignoreClient(client);
    await wait(900);
    const withdrawing = scenario === "assinante-7dias";
    scenario = withdrawing ? "reembolsada" : "cancelada";
    return { data: { mode: withdrawing ? "refunded_and_ended" : "ends_at_period_end", refund: withdrawing ? "refunded" : "none" }, error: null };
  },
  async reactivateSubscription(client) {
    ignoreClient(client);
    await wait();
    if (scenario !== "cancelada") return { data: null, error: apiError("subscription_not_found") };
    scenario = "assinante";
    return { data: null, error: null };
  },
  async openBillingPortal(client) {
    ignoreClient(client);
    await wait();
    // No app real é o portal do gateway; aqui só recarrega a tela de planos no mesmo cenário.
    return { data: { url: `/planos/?estado=${scenario},pro` }, error: null };
  },
} satisfies BillingApi;
