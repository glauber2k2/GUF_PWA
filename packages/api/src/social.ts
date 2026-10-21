import { durationSeconds, pauseStats, type SocialRelationship, type SocialVisibility, type WeightUnit } from "@guf/core";
import type { GufClient } from "./client";
import type { WorkoutSummaryBase, WorkoutSummaryRecord } from "./evolution";
import { apiError, toApiError, type ApiResult } from "./result";
import { FREE_WORKOUT_NAME, resolveAvatarUrl, sessionDurationSeconds, toWeightUnit } from "./shared";
import { buildSummaryExercise, buildSummaryRecord, buildSummaryTotals, type CompletedSetRow } from "./summary-builder";

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

/** Treino concluído de outra pessoa (ou o seu): o resumo, sem observações, projeto nem rotina. */
export interface MemberWorkoutDetail extends WorkoutSummaryBase {
  owner: PersonCard;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface SocialApi {
  getMySocial: (client: GufClient) => Result<MySocial>;
  updateHandle: (client: GufClient, handle: string) => Result;
  /** Abrir o perfil aceita os pedidos pendentes; fechar mantém quem já segue. */
  updateSettings: (client: GufClient, input: SocialSettings) => Result;
  requestFollow: (client: GufClient, userId: string) => Result<FollowStatus>;
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
  /** Detalhe de um treino do histórico (session_not_found = inexistente ou sem permissão; history_hidden). */
  getMemberWorkout: (client: GufClient, input: { sessionId: string }) => Result<MemberWorkoutDetail>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

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

/** jsonb do get_member_workout (migration member_workout_detail). */
interface MemberWorkoutRow {
  session_id: string;
  workout_name: string | null;
  performed_on: string;
  started_at: string;
  finished_at: string | null;
  active_seconds: number | null;
  edited_at: string | null;
  period_count: number;
  owner: { user_id: string; handle: string | null; name: string | null; avatar_url: string | null };
  day_session_ids: string[];
  exercises: Array<{
    id: string;
    exercise_id: string;
    name: string;
    muscle_group: string;
    record_e1rm: number | null;
    previous_e1rm: number | null;
    previous_on: string | null;
    sets: CompletedSetRow[];
  }>;
}

function toMemberWorkout(client: GufClient, row: MemberWorkoutRow, weightUnit: WeightUnit): MemberWorkoutDetail {
  const records: WorkoutSummaryRecord[] = [];
  const exercises = row.exercises.map((e) => {
    const record1RmKg = e.record_e1rm === null ? null : Number(e.record_e1rm);
    const previous = e.previous_e1rm === null || e.previous_on === null ? null : { oneRmKg: Number(e.previous_e1rm), performedOn: e.previous_on };
    const exercise = buildSummaryExercise({ id: e.id, exerciseId: e.exercise_id, name: e.name, muscleGroup: e.muscle_group, note: null, sets: e.sets }, record1RmKg);
    const record = buildSummaryRecord(exercise, record1RmKg, previous);
    if (record) records.push(record);
    return exercise;
  });
  const duration = sessionDurationSeconds(row);
  return {
    id: row.session_id,
    name: row.workout_name ?? FREE_WORKOUT_NAME,
    performedOn: row.performed_on,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    editedAt: row.edited_at,
    durationSeconds: duration,
    ...pauseStats(row.period_count, durationSeconds(row.started_at, row.finished_at), duration),
    ...buildSummaryTotals(exercises),
    exercises,
    records,
    daySessionIds: row.day_session_ids.includes(row.session_id) ? row.day_session_ids : [row.session_id],
    weightUnit,
    owner: toCard(client, row.owner),
  };
}

export const getMemberWorkout: SocialApi["getMemberWorkout"] = async (client, { sessionId }) => {
  try {
    const [workoutRes, profileRes] = await Promise.all([
      client.rpc("get_member_workout", { p_session_id: sessionId }),
      client.from("profiles").select("weight_unit").maybeSingle(),
    ]);
    if (workoutRes.error) return { data: null, error: toApiError(workoutRes.error) };
    if (!workoutRes.data) return { data: null, error: apiError("session_not_found") };
    // O jsonb não tem tipo gerado: o formato é o montado em get_member_workout.
    const row = workoutRes.data as unknown as MemberWorkoutRow;
    return { data: toMemberWorkout(client, row, toWeightUnit(profileRes.data?.weight_unit)), error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const socialApi = {
  getMySocial,
  updateHandle,
  updateSettings,
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
  getMemberWorkout,
} satisfies SocialApi;
