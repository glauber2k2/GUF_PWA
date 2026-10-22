import {
  PLAN_FEATURES,
  type CatalogPlan,
  type Entitlements,
  type FeatureAccess,
  type FeatureKind,
  type PlanFeature,
} from "@guf/core";
import type { Platform } from "./auth";
import type { GufClient } from "./client";
import type { LegalDocument } from "./legal";
import { apiError, toApiError, type ApiResult } from "./result";

/* =====================================================================
 * Contrato — planos e direitos de acesso. SÓ ONLINE (o app guarda a última resposta no aparelho).
 * Quem decide o plano e os limites é o banco (my_entitlements, gatilhos de limite); o app só
 * mostra. Gravações de direitos e assinaturas são do servidor (webhook), nunca do app.
 * ===================================================================== */

type Result<T> = Promise<ApiResult<T>>;

export interface StartSubscriptionInput {
  planCode: string;
  /** Ids exibidos na tela de assinatura (pending_subscription_documents), aceitos juntos. */
  acceptedDocumentIds: string[];
  platform: Platform;
}

export interface PlansApi {
  /** Plano efetivo e o que ele libera em cada funcionalidade. */
  getEntitlements: (client: GufClient, input: null) => Result<Entitlements>;
  /** Planos do catálogo com as funcionalidades (comparação na tela de planos). */
  getPlanCatalog: (client: GufClient, input: null) => Result<CatalogPlan[]>;
  /** Documentos a aceitar para assinar: Termos da Assinatura + o que estiver pendente do cadastro. */
  getSubscriptionDocuments: (client: GufClient, input: null) => Result<LegalDocument[]>;
  /** Inicia a assinatura (aceites + pagamento). Enquanto não houver pagamento: billing_unavailable. */
  startSubscription: (client: GufClient, input: StartSubscriptionInput) => Result<null>;
  /** O treino da própria pessoa existe, mas está fora do histórico do plano? (só sim/não) */
  isSessionHiddenByPlan: (client: GufClient, input: { sessionId: string }) => Result<boolean>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

interface EntitlementsJson {
  plan: { code: string; name: string; is_default: boolean };
  valid_until: string | null;
  features: Record<string, { kind: FeatureKind; enabled: boolean; limit: number | null; upgradable: boolean }>;
}

/** Funcionalidade que o app conhece e o banco não mandou: tratada como não liberada. */
const MISSING_FEATURE = { kind: "flag", enabled: false, limit: null, upgradable: false } as const;

function toEntitlements(json: EntitlementsJson): Entitlements {
  const features = Object.fromEntries(
    PLAN_FEATURES.map((feature) => [feature, json.features[feature] ?? MISSING_FEATURE]),
  ) as Entitlements["features"];
  return {
    planCode: json.plan.code,
    planName: json.plan.name,
    isDefaultPlan: json.plan.is_default,
    validUntil: json.valid_until,
    features,
  };
}

export const getEntitlements: PlansApi["getEntitlements"] = async (client) => {
  try {
    const { data, error } = await client.rpc("my_entitlements");
    if (error) return { data: null, error: toApiError(error) };
    return { data: toEntitlements(data as unknown as EntitlementsJson), error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/** Linha de plan_features → acesso no formato do app (sem linha = não liberado). */
function toFeatureAccess(kind: FeatureKind, row: { limit_value: number | null } | undefined): FeatureAccess {
  if (!row) return { kind, enabled: false, limit: kind === "limit" ? 0 : null };
  const limit = kind === "limit" ? row.limit_value : null;
  return { kind, enabled: limit === null || limit > 0, limit };
}

export const getPlanCatalog: PlansApi["getPlanCatalog"] = async (client) => {
  try {
    const [plans, features, planFeatures] = await Promise.all([
      client.from("plans").select("code, name, rank, is_default, is_purchasable").order("rank"),
      client.from("features").select("code, kind"),
      client.from("plan_features").select("plan_code, feature_code, limit_value"),
    ]);
    if (plans.error) return { data: null, error: toApiError(plans.error) };
    if (features.error) return { data: null, error: toApiError(features.error) };
    if (planFeatures.error) return { data: null, error: toApiError(planFeatures.error) };

    const kindOf = new Map(features.data.map((f) => [f.code, f.kind as FeatureKind]));
    const catalog = plans.data.map<CatalogPlan>((plan) => {
      const rows = planFeatures.data.filter((row) => row.plan_code === plan.code);
      const access = PLAN_FEATURES.map((feature): [PlanFeature, FeatureAccess] => [
        feature,
        toFeatureAccess(kindOf.get(feature) ?? "flag", rows.find((row) => row.feature_code === feature)),
      ]);
      return {
        code: plan.code,
        name: plan.name,
        rank: plan.rank,
        isDefault: plan.is_default,
        isPurchasable: plan.is_purchasable,
        features: Object.fromEntries(access) as CatalogPlan["features"],
      };
    });
    return { data: catalog, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getSubscriptionDocuments: PlansApi["getSubscriptionDocuments"] = async (client) => {
  try {
    const { data, error } = await client.rpc("pending_subscription_documents");
    if (error) return { data: null, error: toApiError(error) };
    return { data: data ?? [], error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/**
 * Pagamento ainda não integrado: recusa ANTES de gravar qualquer aceite, para não registrar
 * concordância com uma assinatura que não aconteceu. Ao integrar o gateway (docs/plans-and-access.md):
 * registrar os aceites (accept_documents, source "subscribe") e abrir o checkout; o direito Pro
 * chega pelo webhook (apply_subscription_event), nunca por esta função.
 */
export const startSubscription: PlansApi["startSubscription"] = async () => ({
  data: null,
  error: apiError("billing_unavailable"),
});


export const isSessionHiddenByPlan: PlansApi["isSessionHiddenByPlan"] = async (client, { sessionId }) => {
  try {
    const { data, error } = await client.rpc("is_session_hidden_by_plan", { p_session_id: sessionId });
    if (error) return { data: null, error: toApiError(error) };
    return { data: data === true, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const plansApi = {
  getEntitlements,
  getPlanCatalog,
  getSubscriptionDocuments,
  startSubscription,
  isSessionHiddenByPlan,
} satisfies PlansApi;
