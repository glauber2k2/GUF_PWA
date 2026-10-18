import type { SocialRelationship, SocialVisibility } from "@guf/core";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import { resolveAvatarUrl } from "./shared";

/* =====================================================================
 * Contrato — perfil social, seguidores e busca (SÓ ONLINE: quem chama trata network_error)
 * Permissões no banco (funções SECURITY DEFINER). LGPD: nada daqui vai para logs.
 * ===================================================================== */

/** Cartão mínimo de uma pessoa (o que qualquer conta logada pode ver). */
export interface PersonCard {
  userId: string;
  handle: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface MySocial {
  userId: string;
  handle: string;
  visibility: SocialVisibility;
  historyHidden: boolean;
  /** Consentimento de compartilhamento ativo (necessário para aceitar seguidor e abrir o perfil). */
  hasConsent: boolean;
  followersCount: number;
  followingCount: number;
  pendingRequestsCount: number;
}

export interface SocialSettings {
  visibility: SocialVisibility;
  historyHidden: boolean;
}

export type FollowStatus = "pending" | "accepted";
export type ConnectionKind = "followers" | "following" | "requests" | "sent" | "blocked";

export interface Connection extends PersonCard {
  status: FollowStatus | "blocked";
  /** Vocês se seguem (competem). */
  isMutual: boolean;
  since: string;
}

export interface PersonSearchResult extends PersonCard {
  visibility: SocialVisibility;
  relationship: SocialRelationship;
  followsYou: boolean;
}

export interface MemberProfile extends PersonCard {
  visibility: SocialVisibility;
  historyHidden: boolean;
  isSelf: boolean;
  relationship: SocialRelationship;
  followsYou: boolean;
  isCompetitor: boolean;
  /** Pode ver estatísticas, sequência e evolução (você, seguidor aceito ou perfil aberto). */
  unlocked: boolean;
  /** Pode ver os registros de treino. */
  historyVisible: boolean;
  followersCount: number;
  followingCount: number;
  /** Só com o perfil desbloqueado (senão null). */
  workoutsCount: number | null;
  firstWorkoutOn: string | null;
  currentStreak: number | null;
  bestStreak: number | null;
  /** Últimas 8 semanas (da mais antiga para a atual): treinou? */
  recentWeeks: boolean[] | null;
}

export interface EvolutionWeek {
  weekStart: string;
  sessions: number;
  volumeKg: number;
  maxWeightKg: number;
  activeSeconds: number;
}

export interface MemberWorkout {
  sessionId: string;
  performedOn: string;
  finishedAt: string;
  name: string | null;
  durationSeconds: number;
  sets: number;
  volumeKg: number;
  records: number;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface SocialApi {
  getMySocial: (client: GufClient) => Result<MySocial>;
  updateHandle: (client: GufClient, handle: string) => Result;
  /** Abrir o perfil exige o consentimento (social_consent_required) e aceita os pedidos pendentes. */
  updateSettings: (client: GufClient, input: SocialSettings) => Result;
  grantSharingConsent: (client: GufClient) => Result;
  /** Remove os seguidores e fecha o perfil. */
  revokeSharingConsent: (client: GufClient) => Result;
  requestFollow: (client: GufClient, userId: string) => Result<FollowStatus>;
  /** Aceitar exige o consentimento (social_consent_required). */
  respondFollowRequest: (client: GufClient, input: { userId: string; accept: boolean }) => Result;
  unfollow: (client: GufClient, userId: string) => Result;
  removeFollower: (client: GufClient, userId: string) => Result;
  blockUser: (client: GufClient, userId: string) => Result;
  unblockUser: (client: GufClient, userId: string) => Result;
  /** userId nulo = suas listas; de outra pessoa, só seguidores/seguindo. */
  listConnections: (client: GufClient, input: { kind: ConnectionKind; userId?: string | null }) => Result<Connection[]>;
  searchPeople: (client: GufClient, query: string) => Result<PersonSearchResult[]>;
  /** Id da pessoa pelo @ (link /pessoa?u=). */
  findByHandle: (client: GufClient, handle: string) => Result<string>;
  /** userId nulo = você. */
  getMemberProfile: (client: GufClient, userId: string | null) => Result<MemberProfile>;
  getMemberEvolution: (client: GufClient, input: { userId: string | null; weeks: number }) => Result<EvolutionWeek[]>;
  listMemberWorkouts: (client: GufClient, input: { userId: string | null; before?: string | null; limit?: number }) => Result<MemberWorkout[]>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const PLATFORM = "web";

function toVisibility(value: string): SocialVisibility {
  return value === "open" ? "open" : "private";
}

function toRelationship(value: string): SocialRelationship {
  return value === "self" || value === "following" || value === "requested" ? value : "none";
}

function toCard(client: GufClient, row: { user_id: string; handle: string | null; name: string | null; avatar_url: string | null }): PersonCard {
  return {
    userId: row.user_id,
    handle: row.handle ?? "",
    name: row.name ?? null,
    avatarUrl: resolveAvatarUrl(client, row.avatar_url, null),
  };
}

async function run(call: () => PromiseLike<{ error: unknown }>): Result {
  try {
    const { error } = await call();
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export const getMySocial: SocialApi["getMySocial"] = async (client) => {
  try {
    const { data, error } = await client.rpc("get_my_social");
    if (error) return { data: null, error: toApiError(error) };
    const row = data[0];
    if (!row) return { data: null, error: apiError("not_authenticated") };
    return {
      data: {
        userId: row.user_id,
        handle: row.handle,
        visibility: toVisibility(row.visibility),
        historyHidden: row.history_hidden,
        hasConsent: row.has_consent,
        followersCount: row.followers_count,
        followingCount: row.following_count,
        pendingRequestsCount: row.pending_requests_count,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const updateHandle: SocialApi["updateHandle"] = (client, handle) => run(() => client.rpc("update_social_handle", { p_handle: handle }));

export const updateSettings: SocialApi["updateSettings"] = (client, { visibility, historyHidden }) =>
  run(() => client.rpc("update_social_settings", { p_visibility: visibility, p_history_hidden: historyHidden }));

export const grantSharingConsent: SocialApi["grantSharingConsent"] = (client) => run(() => client.rpc("grant_social_consent", { p_platform: PLATFORM }));

export const revokeSharingConsent: SocialApi["revokeSharingConsent"] = (client) => run(() => client.rpc("revoke_social_consent", { p_platform: PLATFORM }));

export const requestFollow: SocialApi["requestFollow"] = async (client, userId) => {
  try {
    const { data, error } = await client.rpc("request_follow", { p_user_id: userId });
    if (error) return { data: null, error: toApiError(error) };
    return { data: data === "accepted" ? "accepted" : "pending", error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const respondFollowRequest: SocialApi["respondFollowRequest"] = (client, { userId, accept }) =>
  run(() => client.rpc("respond_follow_request", { p_user_id: userId, p_accept: accept }));

export const unfollow: SocialApi["unfollow"] = (client, userId) => run(() => client.rpc("unfollow", { p_user_id: userId }));

export const removeFollower: SocialApi["removeFollower"] = (client, userId) => run(() => client.rpc("remove_follower", { p_user_id: userId }));

export const blockUser: SocialApi["blockUser"] = (client, userId) => run(() => client.rpc("block_user", { p_user_id: userId }));

export const unblockUser: SocialApi["unblockUser"] = (client, userId) => run(() => client.rpc("unblock_user", { p_user_id: userId }));

export const listConnections: SocialApi["listConnections"] = async (client, { kind, userId }) => {
  try {
    const { data, error } = await client.rpc("list_social_connections", { p_kind: kind, ...(userId ? { p_user_id: userId } : {}) });
    if (error) return { data: null, error: toApiError(error) };
    return {
      data: data.map((row) => ({
        ...toCard(client, row),
        status: row.status === "accepted" || row.status === "blocked" ? row.status : "pending",
        isMutual: row.is_mutual,
        since: row.since,
      })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const searchPeople: SocialApi["searchPeople"] = async (client, query) => {
  try {
    const { data, error } = await client.rpc("search_social_profiles", { p_query: query });
    if (error) return { data: null, error: toApiError(error) };
    return {
      data: data.map((row) => ({
        ...toCard(client, row),
        visibility: toVisibility(row.visibility),
        relationship: toRelationship(row.relationship),
        followsYou: row.follows_you,
      })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const findByHandle: SocialApi["findByHandle"] = async (client, handle) => {
  try {
    const { data, error } = await client.rpc("find_social_profile", { p_handle: handle });
    if (error) return { data: null, error: toApiError(error) };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getMemberProfile: SocialApi["getMemberProfile"] = async (client, userId) => {
  try {
    const [{ data, error }, session] = await Promise.all([
      client.rpc("get_member_profile", userId ? { p_user_id: userId } : {}),
      client.auth.getSession(),
    ]);
    if (error) return { data: null, error: toApiError(error) };
    const row = data[0];
    if (!row) return { data: null, error: apiError("person_not_found") };
    // A própria foto segue a mesma prioridade do resto do app (foto atual da conta Google).
    const avatarUrl = resolveAvatarUrl(client, row.avatar_url, row.is_self ? session.data.session?.user : null);
    return {
      data: {
        ...toCard(client, row),
        avatarUrl,
        visibility: toVisibility(row.visibility),
        historyHidden: row.history_hidden,
        isSelf: row.is_self,
        relationship: toRelationship(row.relationship),
        followsYou: row.follows_you,
        isCompetitor: row.is_competitor,
        unlocked: row.unlocked,
        historyVisible: row.history_visible,
        followersCount: row.followers_count,
        followingCount: row.following_count,
        workoutsCount: row.workouts_count ?? null,
        firstWorkoutOn: row.first_workout_on ?? null,
        currentStreak: row.current_streak ?? null,
        bestStreak: row.best_streak ?? null,
        recentWeeks: row.recent_weeks ?? null,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getMemberEvolution: SocialApi["getMemberEvolution"] = async (client, { userId, weeks }) => {
  try {
    const { data, error } = await client.rpc("get_member_evolution", { p_weeks: weeks, ...(userId ? { p_user_id: userId } : {}) });
    if (error) return { data: null, error: toApiError(error) };
    return {
      data: data.map((row) => ({
        weekStart: row.week_start,
        sessions: row.sessions,
        volumeKg: Number(row.volume_kg),
        maxWeightKg: Number(row.max_weight_kg),
        activeSeconds: row.active_seconds,
      })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const listMemberWorkouts: SocialApi["listMemberWorkouts"] = async (client, { userId, before, limit }) => {
  try {
    const { data, error } = await client.rpc("list_member_workouts", {
      ...(userId ? { p_user_id: userId } : {}),
      ...(before ? { p_before: before } : {}),
      ...(limit ? { p_limit: limit } : {}),
    });
    if (error) return { data: null, error: toApiError(error) };
    return {
      data: data.map((row) => ({
        sessionId: row.session_id,
        performedOn: row.performed_on,
        finishedAt: row.finished_at,
        name: row.name ?? null,
        durationSeconds: row.duration_seconds,
        sets: row.sets,
        volumeKg: Number(row.volume_kg),
        records: row.records,
      })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const socialApi = {
  getMySocial,
  updateHandle,
  updateSettings,
  grantSharingConsent,
  revokeSharingConsent,
  requestFollow,
  respondFollowRequest,
  unfollow,
  removeFollower,
  blockUser,
  unblockUser,
  listConnections,
  searchPeople,
  findByHandle,
  getMemberProfile,
  getMemberEvolution,
  listMemberWorkouts,
} satisfies SocialApi;
