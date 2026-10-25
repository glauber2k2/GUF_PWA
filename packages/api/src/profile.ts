import {
  AVATAR_BUCKET,
  AVATAR_CACHE_SECONDS,
  avatarStoragePath,
  isAvatarFormat,
  isUploadedAvatar,
  toExperienceLevel,
  toStoredBio,
  toTrainingGoals,
  type ExperienceLevel,
  type LegalDocType,
  type TrainingGoal,
  type WeightUnit,
} from "@guf/core";
import type { Json } from "@guf/types";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiError, type ApiResult } from "./result";
import { currentUserId, fetchTrainingTotals, resolveAvatarUrl } from "./shared";

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
  /** Finalizar o treino sozinho 30 min depois da última série, quando todas estão concluídas (servidor). */
  autoFinishWorkout: boolean;
  /** Não receber comunicados de produto (novidades do guf); serviço e legal continuam. */
  productAnnouncementsOptOut: boolean;
  /** Primeiro treino concluído ("yyyy-MM-dd") e total de treinos concluídos. */
  firstTrainedOn: string | null;
  completedSessions: number;
  /** Bio do perfil social (cartão, visível a qualquer conta logada). */
  bio: string | null;
  /** Objetivos e experiência: só quem pode ver seus treinos. */
  trainingGoals: TrainingGoal[];
  experienceLevel: ExperienceLevel | null;
  /** A foto mostrada foi enviada pelo usuário (e pode ser removida). */
  hasUploadedPhoto: boolean;
}

export interface ProfileUpdate {
  /** Bio vazia apaga (null no banco). */
  bio?: string;
  trainingGoals?: TrainingGoal[];
  experienceLevel?: ExperienceLevel | null;
  name?: string;
  weightUnit?: WeightUnit;
  weeklyGoal?: number;
  autoFinishWorkout?: boolean;
  productAnnouncementsOptOut?: boolean;
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
  /** Envia a foto (já recortada e reduzida no aparelho) e passa a usá-la; devolve a URL pública. */
  uploadAvatar: (client: GufClient, image: Blob) => Result<string>;
  /** Apaga a foto enviada; volta para a da conta Google ou para a inicial. Devolve a foto que ficou. */
  removeAvatar: (client: GufClient) => Result<string | null>;
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
    const [session, profileRes, totalsRes] = await Promise.all([
      client.auth.getSession(),
      client
        .from("profiles")
        .select("name, avatar_url, bio, training_goals, experience_level, weight_unit, weekly_goal, auto_finish_workout, product_announcements_opt_out")
        .eq("id", userId)
        .maybeSingle(),
      // Histórico inteiro (o 1º treino e o total não dependem do plano).
      fetchTrainingTotals(client),
    ]);
    const failed = [profileRes, totalsRes].find((r) => r.error)?.error;
    if (failed) return { data: null, error: toApiError(failed) };
    return {
      data: {
        name: profileRes.data?.name ?? null,
        email: session.data.session?.user.email ?? null,
        avatarUrl: resolveAvatarUrl(client, profileRes.data?.avatar_url, session.data.session?.user),
        weightUnit: profileRes.data?.weight_unit === "lb" ? "lb" : "kg",
        weeklyGoal: profileRes.data?.weekly_goal ?? 3,
        autoFinishWorkout: profileRes.data?.auto_finish_workout ?? false,
        productAnnouncementsOptOut: profileRes.data?.product_announcements_opt_out ?? false,
        firstTrainedOn: totalsRes.data?.firstTrainedOn ?? null,
        completedSessions: totalsRes.data?.completedSessions ?? 0,
        bio: profileRes.data?.bio ?? null,
        trainingGoals: toTrainingGoals(profileRes.data?.training_goals),
        experienceLevel: toExperienceLevel(profileRes.data?.experience_level),
        hasUploadedPhoto: isUploadedAvatar(profileRes.data?.avatar_url),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const updateProfile: ProfileApi["updateProfile"] = async (
  client,
  { name, bio, trainingGoals, experienceLevel, weightUnit, weeklyGoal, autoFinishWorkout, productAnnouncementsOptOut },
) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const changes = {
      ...(name !== undefined && { name: name.trim() }),
      ...(bio !== undefined && { bio: toStoredBio(bio) }),
      ...(trainingGoals !== undefined && { training_goals: trainingGoals }),
      ...(experienceLevel !== undefined && { experience_level: experienceLevel }),
      ...(weightUnit !== undefined && { weight_unit: weightUnit }),
      ...(weeklyGoal !== undefined && { weekly_goal: weeklyGoal }),
      ...(autoFinishWorkout !== undefined && { auto_finish_workout: autoFinishWorkout }),
      ...(productAnnouncementsOptOut !== undefined && { product_announcements_opt_out: productAnnouncementsOptOut }),
    };
    const { error } = await client.from("profiles").update(changes).eq("id", userId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

const AVATAR_UPLOAD_FAILED = apiError("avatar_upload_failed");

/** Apaga as fotos da pasta do usuário, menos a que ficou em uso (falha aqui não desfaz a troca). */
async function removeOtherAvatars(client: GufClient, userId: string, keepPath: string | null): Promise<void> {
  const avatars = client.storage.from(AVATAR_BUCKET);
  const { data: files } = await avatars.list(userId, { limit: 100 });
  const stale = (files ?? []).map((file) => `${userId}/${file.name}`).filter((path) => path !== keepPath);
  if (stale.length > 0) await avatars.remove(stale);
}

export const uploadAvatar: ProfileApi["uploadAvatar"] = async (client, image) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    if (!isAvatarFormat(image.type)) return { data: null, error: AVATAR_UPLOAD_FAILED };
    // Nome novo a cada troca: a URL pública muda, nenhum cache mostra a foto antiga e o arquivo pode ficar em cache por 1 ano.
    const path = avatarStoragePath(userId, crypto.randomUUID(), image.type);
    const upload = await client.storage
      .from(AVATAR_BUCKET)
      .upload(path, image, { contentType: image.type, upsert: false, cacheControl: String(AVATAR_CACHE_SECONDS) });
    if (upload.error) {
      const mapped = toApiError(upload.error);
      return { data: null, error: mapped.code === "network_error" ? mapped : AVATAR_UPLOAD_FAILED };
    }
    const { error } = await client.from("profiles").update({ avatar_url: path }).eq("id", userId);
    if (error) {
      await client.storage.from(AVATAR_BUCKET).remove([path]);
      return { data: null, error: toApiError(error) };
    }
    await removeOtherAvatars(client, userId, path);
    return { data: client.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const removeAvatar: ProfileApi["removeAvatar"] = async (client) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { error } = await client.rpc("clear_uploaded_avatar");
    if (error) return { data: null, error: toApiError(error) };
    await removeOtherAvatars(client, userId, null);
    const [session, profileRes] = await Promise.all([
      client.auth.getSession(),
      client.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(),
    ]);
    return { data: resolveAvatarUrl(client, profileRes.data?.avatar_url, session.data.session?.user), error: null };
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
  uploadAvatar,
  removeAvatar,
  getConsents,
  revokeHealthConsent,
  exportMyData,
  deleteAccount,
} satisfies ProfileApi;
