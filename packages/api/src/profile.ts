import type { LegalDocType, WeightUnit } from "@guf/core";
import type { Json } from "@guf/types";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiError, type ApiResult } from "./result";
import { currentUserId, resolveAvatarUrl } from "./shared";

/* =====================================================================
 * Contrato — tela Perfil (edições SÓ ONLINE: quem chama trata network_error)
 * LGPD: nada daqui vai para logs, Sentry ou analytics (inclusive o export e as medidas).
 * ===================================================================== */

export interface Profile {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  weightUnit: WeightUnit;
  /** Meta semanal (1–7, só exibição). */
  weeklyGoal: number;
  /** Primeiro treino concluído ("yyyy-MM-dd") e total de treinos concluídos. */
  firstTrainedOn: string | null;
  completedSessions: number;
}

export interface ProfileUpdate {
  name?: string;
  weightUnit?: WeightUnit;
  weeklyGoal?: number;
}

/** Último aceite de cada documento (versão, data e onde ler). */
export interface AcceptedDocument {
  docType: LegalDocType;
  version: string;
  url: string;
  acceptedAt: string;
}

export interface Consents {
  documents: AcceptedDocument[];
  /** Consentimento de saúde ativo (versão vigente, última ação = aceite). */
  healthConsent: boolean;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface ProfileApi {
  getProfile: (client: GufClient) => Result<Profile>;
  updateProfile: (client: GufClient, input: ProfileUpdate) => Result;
  getConsents: (client: GufClient) => Result<Consents>;
  /** Revoga o consentimento de saúde E apaga todas as medidas (RPC revoke_health_consent). */
  revokeHealthConsent: (client: GufClient) => Result;
  /** Todos os dados do usuário (RPC export_my_data), para baixar como JSON. */
  exportMyData: (client: GufClient) => Result<Json>;
  /** Exclui a conta e todos os dados (Edge Function delete-account). Quem chama faz o signOut. */
  deleteAccount: (client: GufClient) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const LEGAL_ORDER: LegalDocType[] = ["terms", "privacy", "age_declaration", "health_consent"];

export const getProfile: ProfileApi["getProfile"] = async (client) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const [session, profileRes, firstRes, countRes] = await Promise.all([
      client.auth.getSession(),
      client.from("profiles").select("name, avatar_url, weight_unit, weekly_goal").eq("id", userId).maybeSingle(),
      client
        .from("workout_sessions")
        .select("performed_on")
        .eq("status", "completed")
        .order("performed_on", { ascending: true })
        .limit(1)
        .maybeSingle(),
      client.from("workout_sessions").select("id", { count: "exact", head: true }).eq("status", "completed"),
    ]);
    const failed = [profileRes, firstRes, countRes].find((r) => r.error)?.error;
    if (failed) return { data: null, error: toApiError(failed) };
    return {
      data: {
        name: profileRes.data?.name ?? null,
        email: session.data.session?.user.email ?? null,
        avatarUrl: resolveAvatarUrl(client, profileRes.data?.avatar_url, session.data.session?.user),
        weightUnit: profileRes.data?.weight_unit === "lb" ? "lb" : "kg",
        weeklyGoal: profileRes.data?.weekly_goal ?? 3,
        firstTrainedOn: firstRes.data?.performed_on ?? null,
        completedSessions: countRes.count ?? 0,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const updateProfile: ProfileApi["updateProfile"] = async (client, { name, weightUnit, weeklyGoal }) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const changes = {
      ...(name !== undefined && { name: name.trim() }),
      ...(weightUnit !== undefined && { weight_unit: weightUnit }),
      ...(weeklyGoal !== undefined && { weekly_goal: weeklyGoal }),
    };
    const { error } = await client.from("profiles").update(changes).eq("id", userId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getConsents: ProfileApi["getConsents"] = async (client) => {
  try {
    const [recordsRes, healthRes] = await Promise.all([
      client
        .from("consent_records")
        .select("action, created_at, legal_documents(doc_type, version, url)")
        .order("created_at", { ascending: false }),
      client.rpc("has_health_consent"),
    ]);
    if (recordsRes.error) return { data: null, error: toApiError(recordsRes.error) };
    if (healthRes.error) return { data: null, error: toApiError(healthRes.error) };

    // Registros só são incluídos (nunca editados): vale a ação mais recente de cada tipo.
    const latest = new Map<LegalDocType, AcceptedDocument | null>();
    for (const record of recordsRes.data) {
      const doc = record.legal_documents;
      if (!doc) continue;
      const type = doc.doc_type as LegalDocType;
      if (latest.has(type)) continue;
      latest.set(type, record.action === "granted" ? { docType: type, version: doc.version, url: doc.url, acceptedAt: record.created_at } : null);
    }
    const healthConsent = healthRes.data === true;
    return {
      data: {
        documents: LEGAL_ORDER.flatMap((type) => {
          const doc = latest.get(type);
          // Saúde só aparece com o consentimento ativo (versão vigente).
          return doc && (type !== "health_consent" || healthConsent) ? [doc] : [];
        }),
        healthConsent,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const revokeHealthConsent: ProfileApi["revokeHealthConsent"] = async (client) => {
  try {
    const { error } = await client.rpc("revoke_health_consent", { p_platform: "web" });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const exportMyData: ProfileApi["exportMyData"] = async (client) => {
  try {
    const { data, error } = await client.rpc("export_my_data");
    return error ? { data: null, error: toApiError(error) } : { data, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

const DELETE_FAILED: ApiError = {
  code: "unknown",
  message: "Não foi possível excluir sua conta agora. Verifique a internet e tente de novo.",
};

export const deleteAccount: ProfileApi["deleteAccount"] = async (client) => {
  try {
    const { error } = await client.functions.invoke("delete-account", { method: "POST" });
    if (!error) return { data: null, error: null };
    // FunctionsFetchError = sem conexão; demais = falha da função (mensagem própria, sem detalhes técnicos).
    return { data: null, error: error.name === "FunctionsFetchError" ? apiError("network_error") : DELETE_FAILED };
  } catch (e) {
    const mapped = toApiError(e);
    return { data: null, error: mapped.code === "network_error" ? mapped : DELETE_FAILED };
  }
};

export const profileApi = {
  getProfile,
  updateProfile,
  getConsents,
  revokeHealthConsent,
  exportMyData,
  deleteAccount,
} satisfies ProfileApi;
