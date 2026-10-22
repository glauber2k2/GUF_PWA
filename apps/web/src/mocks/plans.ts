/**
 * MOCK dos planos — mesmo contrato de @guf/api (PlansApi), com o catálogo da migration
 * plans_and_entitlements. Usado SÓ em desenvolvimento com ?estado= (padrão: Free; `pro` = Pro).
 * Os dados são montados sob demanda (nada roda ao carregar o módulo, para o build descartar o mock).
 */
import { apiError, type GufClient, type LegalDocument, type PlansApi } from "@guf/api";
import type { CatalogPlan, Entitlements, FeatureAccess, PlanFeature } from "@guf/core";

export type PlansMockScenario = "free" | "pro";

const LATENCY_MS = 250;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

let scenario: PlansMockScenario = "free";

/** Plano simulado (definido pela tela a partir do ?estado=). */
export function setPlansMockScenario(next: PlansMockScenario) {
  scenario = next;
}

function ignoreClient(client: GufClient) {
  void client;
}

const limit = (value: number | null): FeatureAccess => ({ kind: "limit", enabled: value === null || value > 0, limit: value });
const flag = (enabled: boolean): FeatureAccess => ({ kind: "flag", enabled, limit: null });

function buildCatalog(): CatalogPlan[] {
  const free: Record<PlanFeature, FeatureAccess> = {
    custom_projects: limit(0),
    routines_per_project: limit(5),
    guf_ai_daily_messages: limit(3),
    history_months: limit(2),
    competition_full_history: flag(false),
  };
  const pro: Record<PlanFeature, FeatureAccess> = {
    custom_projects: limit(null),
    routines_per_project: limit(null),
    guf_ai_daily_messages: limit(40),
    history_months: limit(null),
    competition_full_history: flag(true),
  };
  return [
    { code: "free", name: "Free", rank: 0, isDefault: true, isPurchasable: false, features: free },
    { code: "pro", name: "Pro", rank: 20, isDefault: false, isPurchasable: true, features: pro },
  ];
}

function buildEntitlements(): Entitlements {
  const [free, pro] = buildCatalog();
  const plan = scenario === "pro" ? pro : free;
  const features = Object.fromEntries(
    (Object.keys(plan.features) as PlanFeature[]).map((feature) => [
      feature,
      { ...plan.features[feature], upgradable: plan.code === "free" && JSON.stringify(free.features[feature]) !== JSON.stringify(pro.features[feature]) },
    ]),
  ) as Entitlements["features"];
  return { planCode: plan.code, planName: plan.name, isDefaultPlan: plan.isDefault, validUntil: null, features };
}

function buildSubscriptionDocument(): LegalDocument {
  return {
    id: "00000000-0000-4000-8000-000000000099",
    doc_type: "subscription_terms",
    version: "0.1-dev",
    url: "/termos-da-assinatura",
    content_hash: "mock",
    summary_hash: null,
    requires_reaccept: true,
    published_at: "2026-10-21T20:00:00Z",
  };
}

export const mockPlansApi = {
  async getEntitlements(client) {
    ignoreClient(client);
    await wait();
    return { data: buildEntitlements(), error: null };
  },
  async getPlanCatalog(client) {
    ignoreClient(client);
    await wait();
    return { data: buildCatalog(), error: null };
  },
  async getSubscriptionDocuments(client) {
    ignoreClient(client);
    await wait();
    return { data: scenario === "pro" ? [] : [buildSubscriptionDocument()], error: null };
  },
  async startSubscription(client) {
    ignoreClient(client);
    await wait();
    return { data: null, error: apiError("billing_unavailable") };
  },
  async isSessionHiddenByPlan(client) {
    ignoreClient(client);
    await wait();
    return { data: false, error: null };
  },
} satisfies PlansApi;
