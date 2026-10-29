import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import { currentUserId } from "./shared";

/* =====================================================================
 * Contrato — tour de onboarding (conclusão por conta, vale em todos os aparelhos)
 * ===================================================================== */

export interface TourProgress {
  /** Versão do tour que a pessoa concluiu ou pulou; null = nunca. */
  completedVersion: number | null;
}

/** Cadastro em passos depois de criar a conta (nome e @, foto, amigos). */
export interface ProfileSetupStatus {
  /** Concluiu ou pulou; contas antigas já vêm concluídas. */
  isCompleted: boolean;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface OnboardingApi {
  getTourProgress: (client: GufClient) => Result<TourProgress>;
  /** Marca a versão do tour como concluída (pular também conta). */
  completeTour: (client: GufClient, input: { version: number }) => Result;
  getProfileSetupStatus: (client: GufClient) => Result<ProfileSetupStatus>;
  /** Marca o cadastro em passos como concluído (pular também conta). */
  completeProfileSetup: (client: GufClient) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

export const getTourProgress: OnboardingApi["getTourProgress"] = async (client) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { data, error } = await client.from("profiles").select("tour_completed_version").eq("id", userId).maybeSingle();
    if (error) return { data: null, error: toApiError(error) };
    return { data: { completedVersion: data?.tour_completed_version ?? null }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const completeTour: OnboardingApi["completeTour"] = async (client, { version }) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { error } = await client.from("profiles").update({ tour_completed_version: version }).eq("id", userId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getProfileSetupStatus: OnboardingApi["getProfileSetupStatus"] = async (client) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { data, error } = await client.from("profiles").select("profile_setup_completed_at").eq("id", userId).maybeSingle();
    if (error) return { data: null, error: toApiError(error) };
    return { data: { isCompleted: Boolean(data?.profile_setup_completed_at) }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const completeProfileSetup: OnboardingApi["completeProfileSetup"] = async (client) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { error } = await client.from("profiles").update({ profile_setup_completed_at: new Date().toISOString() }).eq("id", userId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const onboardingApi = { getTourProgress, completeTour, getProfileSetupStatus, completeProfileSetup } satisfies OnboardingApi;
