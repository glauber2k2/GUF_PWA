import type { ChangeReason, DocumentAcceptance } from "@guf/core";
import type { GufClient } from "../client";
import { API_ERROR_MESSAGES, apiError, toApiError, type ApiErrorCode, type ApiResult } from "../result";
import { runQuery } from "./run-query";

/* =====================================================================
 * Contrato — Contas no painel (só o resumo de docs/admin-panel.md §1.3).
 * Nunca medidas, observações, conversas, séries ou cargas. E-mail mascarado; o completo só por
 * revealEmail (auditado). Toda abertura de conta e toda alteração ficam na auditoria (no banco).
 * ===================================================================== */

export interface AdminUserSummary {
  userId: string;
  name: string | null;
  handle: string | null;
  maskedEmail: string | null;
  planCode: string;
  planName: string;
  isDefaultPlan: boolean;
  createdAt: string;
  isPrivate: boolean;
  isBanned: boolean;
  /** Fim da suspensão ativa; null = indeterminada (ou sem suspensão). */
  banEndsAt: string | null;
  deletionScheduledFor: string | null;
}

export interface AdminPlanGrant {
  id: string;
  planCode: string;
  planName: string;
  source: "subscription" | "manual" | "trial";
  validFrom: string;
  validUntil: string | null;
  revokedAt: string | null;
}

export interface AdminStaffActivity {
  id: number;
  occurredAt: string;
  staffName: string;
  action: string;
  reason: ChangeReason | null;
  note: string | null;
}

export interface AdminAccountBan {
  /** null = indeterminada. */
  endsAt: string | null;
  reason: ChangeReason;
  note: string | null;
  createdAt: string;
}

export interface AdminDeletionSchedule {
  scheduledFor: string;
  reason: ChangeReason;
  note: string | null;
  createdAt: string;
  /** A última tentativa não excluiu (ex.: "account_has_files"). */
  lastError: string | null;
}

export interface AdminUserDocument {
  docType: string;
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  status: DocumentAcceptance;
}

export interface AdminUserDetail {
  userId: string;
  name: string | null;
  handle: string | null;
  isPrivate: boolean;
  maskedEmail: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  hasPassword: boolean;
  /** Conta de alguém da equipe: não pode ser suspensa nem excluída pelo painel. */
  isStaff: boolean;
  logins: Array<{ provider: string; createdAt: string }>;
  plan: { code: string; name: string; isDefault: boolean };
  planGrants: AdminPlanGrant[];
  followers: number;
  following: number;
  workouts: number;
  /** Documentos vigentes do cadastro e da assinatura, aceitos ou não. */
  documents: AdminUserDocument[];
  /** Só o sim/não (nunca as medidas); null quando o papel não vê (Leitura). */
  healthConsent: boolean | null;
  ban: AdminAccountBan | null;
  deletion: AdminDeletionSchedule | null;
  staffActivity: AdminStaffActivity[];
}

export type HandleAvailability = "available" | "taken" | "invalid" | "same";

export interface ReasonInput {
  reason: ChangeReason;
  note: string;
}

export interface AdminPlanOption {
  code: string;
  name: string;
  isDefault: boolean;
  /** Ordem dos planos (maior = mais recursos): define upgrade ou downgrade. */
  rank: number;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface AdminUsersApi {
  searchUsers: (client: GufClient, query: string) => Result<AdminUserSummary[]>;
  getUser: (client: GufClient, userId: string) => Result<AdminUserDetail>;
  revealEmail: (client: GufClient, userId: string) => Result<string>;
  checkHandle: (client: GufClient, input: { userId: string; handle: string }) => Result<HandleAvailability>;
  updateHandle: (client: GufClient, input: ReasonInput & { userId: string; handle: string }) => Result;
  updateName: (client: GufClient, input: ReasonInput & { userId: string; name: string }) => Result;
  /** `notify`: manda à pessoa o aviso de upgrade, downgrade ou alteração (o banco decide qual). */
  setPlan: (client: GufClient, input: ReasonInput & { userId: string; planCode: string; validUntil: string | null; notify: boolean }) => Result;
  unlinkLogin: (client: GufClient, input: { userId: string; provider: string; note: string }) => Result;
  /** Todos os logins sociais de uma vez (ações em lote); devolve quantos saíram. */
  unlinkSocialLogins: (client: GufClient, input: { userId: string; note: string }) => Result<number>;
  /** endsAt null = indeterminado. */
  banUser: (client: GufClient, input: ReasonInput & { userId: string; endsAt: string | null }) => Result;
  unbanUser: (client: GufClient, input: ReasonInput & { userId: string }) => Result;
  deleteUser: (client: GufClient, input: ReasonInput & { userId: string }) => Result;
  scheduleDeletion: (client: GufClient, input: ReasonInput & { userId: string; at: string }) => Result;
  cancelDeletion: (client: GufClient, input: ReasonInput & { userId: string }) => Result;
  /** Manda à pessoa o e-mail para criar uma senha nova (a equipe nunca vê a senha). Só individual. */
  sendPasswordReset: (client: GufClient, input: ReasonInput & { userId: string }) => Result;
  listPlans: (client: GufClient) => Result<AdminPlanOption[]>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

function noteOrNull(note: string): string | null {
  return note.trim() ? note.trim() : null;
}

interface UserDetailRow {
  id: string;
  name: string | null;
  handle: string | null;
  visibility: string;
  masked_email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  has_password: boolean;
  is_staff: boolean;
  logins: Array<{ provider: string; created_at: string }>;
  plan: { code: string; name: string; is_default: boolean };
  plan_grants: Array<{
    id: string;
    plan_code: string;
    plan_name: string;
    source: AdminPlanGrant["source"];
    valid_from: string;
    valid_until: string | null;
    revoked_at: string | null;
  }>;
  followers: number;
  following: number;
  workouts: number;
  documents: Array<{
    doc_type: string;
    current_version: string;
    accepted_version: string | null;
    accepted_at: string | null;
    status: DocumentAcceptance;
  }>;
  health_consent: boolean | null;
  ban: { ends_at: string | null; reason: ChangeReason; note: string | null; created_at: string } | null;
  deletion: { scheduled_for: string; reason: ChangeReason; note: string | null; created_at: string; last_error: string | null } | null;
  staff_activity: Array<{ id: number; occurred_at: string; staff_name: string; action: string; details: { reason?: ChangeReason; note?: string } }>;
}

function toUserDetail(row: UserDetailRow): AdminUserDetail {
  return {
    userId: row.id,
    name: row.name,
    handle: row.handle,
    isPrivate: row.visibility !== "open",
    maskedEmail: row.masked_email,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
    hasPassword: row.has_password,
    isStaff: row.is_staff,
    logins: row.logins.map((l) => ({ provider: l.provider, createdAt: l.created_at })),
    plan: { code: row.plan.code, name: row.plan.name, isDefault: row.plan.is_default },
    planGrants: row.plan_grants.map((g) => ({
      id: g.id,
      planCode: g.plan_code,
      planName: g.plan_name,
      source: g.source,
      validFrom: g.valid_from,
      validUntil: g.valid_until,
      revokedAt: g.revoked_at,
    })),
    followers: Number(row.followers),
    following: Number(row.following),
    workouts: Number(row.workouts),
    documents: row.documents.map((d) => ({
      docType: d.doc_type,
      currentVersion: d.current_version,
      acceptedVersion: d.accepted_version,
      acceptedAt: d.accepted_at,
      status: d.status,
    })),
    healthConsent: row.health_consent,
    ban: row.ban && { endsAt: row.ban.ends_at, reason: row.ban.reason, note: row.ban.note, createdAt: row.ban.created_at },
    deletion: row.deletion && {
      scheduledFor: row.deletion.scheduled_for,
      reason: row.deletion.reason,
      note: row.deletion.note,
      createdAt: row.deletion.created_at,
      lastError: row.deletion.last_error,
    },
    staffActivity: row.staff_activity.map((a) => ({
      id: a.id,
      occurredAt: a.occurred_at,
      staffName: a.staff_name,
      action: a.action,
      reason: a.details.reason ?? null,
      note: a.details.note ?? null,
    })),
  };
}

export const searchUsers: AdminUsersApi["searchUsers"] = async (client, query) => {
  const result = await runQuery(() => client.rpc("admin_search_users", { p_query: query }));
  if (result.error) return result;
  return {
    data: (result.data ?? []).map((r) => ({
      userId: r.user_id,
      name: r.name,
      handle: r.handle,
      maskedEmail: r.masked_email,
      planCode: r.plan_code,
      planName: r.plan_name,
      isDefaultPlan: r.plan_is_default,
      createdAt: r.created_at,
      isPrivate: r.visibility !== "open",
      isBanned: r.is_banned,
      banEndsAt: r.ban_ends_at,
      deletionScheduledFor: r.deletion_scheduled_for,
    })),
    error: null,
  };
};

export const getUser: AdminUsersApi["getUser"] = async (client, userId) => {
  const result = await runQuery(() => client.rpc("admin_get_user", { p_user_id: userId }));
  if (result.error) return result;
  return { data: toUserDetail(result.data as unknown as UserDetailRow), error: null };
};

export const revealEmail: AdminUsersApi["revealEmail"] = async (client, userId) => {
  const result = await runQuery(() => client.rpc("admin_reveal_email", { p_user_id: userId }));
  return result.error ? result : { data: result.data ?? "", error: null };
};

export const checkHandle: AdminUsersApi["checkHandle"] = async (client, { userId, handle }) => {
  const result = await runQuery(() => client.rpc("admin_check_handle", { p_user_id: userId, p_handle: handle }));
  if (result.error) return result;
  return { data: result.data as HandleAvailability, error: null };
};

export const updateHandle: AdminUsersApi["updateHandle"] = async (client, { userId, handle, reason, note }) => {
  const result = await runQuery(() =>
    client.rpc("admin_update_handle", { p_user_id: userId, p_handle: handle, p_reason: reason, p_note: noteOrNull(note) ?? undefined }),
  );
  return result.error ? result : { data: null, error: null };
};

export const updateName: AdminUsersApi["updateName"] = async (client, { userId, name, reason, note }) => {
  const result = await runQuery(() =>
    client.rpc("admin_update_name", { p_user_id: userId, p_name: name, p_reason: reason, p_note: noteOrNull(note) ?? undefined }),
  );
  return result.error ? result : { data: null, error: null };
};

export const setPlan: AdminUsersApi["setPlan"] = async (client, { userId, planCode, validUntil, reason, note, notify }) => {
  const result = await runQuery(() =>
    client.rpc("admin_set_plan", {
      p_user_id: userId,
      p_plan_code: planCode,
      // null = sem validade (o tipo gerado não aceita null em argumentos com padrão)
      p_valid_until: validUntil as string,
      p_reason: reason,
      p_note: noteOrNull(note) ?? undefined,
      p_notify: notify,
    }),
  );
  return result.error ? result : { data: null, error: null };
};

export const unlinkLogin: AdminUsersApi["unlinkLogin"] = async (client, { userId, provider, note }) => {
  const result = await runQuery(() =>
    client.rpc("admin_unlink_identity", { p_user_id: userId, p_provider: provider, p_note: noteOrNull(note) ?? undefined }),
  );
  return result.error ? result : { data: null, error: null };
};

export const unlinkSocialLogins: AdminUsersApi["unlinkSocialLogins"] = async (client, { userId, note }) => {
  const result = await runQuery(() => client.rpc("admin_unlink_social_identities", { p_user_id: userId, p_note: noteOrNull(note) ?? undefined }));
  return result.error ? result : { data: result.data ?? 0, error: null };
};

export const banUser: AdminUsersApi["banUser"] = async (client, { userId, endsAt, reason, note }) => {
  const result = await runQuery(() =>
    client.rpc("admin_ban_user", {
      p_user_id: userId,
      // null = indeterminado (o tipo gerado não aceita null em timestamptz)
      p_ends_at: endsAt as string,
      p_reason: reason,
      p_note: noteOrNull(note) ?? undefined,
    }),
  );
  return result.error ? result : { data: null, error: null };
};

export const unbanUser: AdminUsersApi["unbanUser"] = async (client, { userId, reason, note }) => {
  const result = await runQuery(() => client.rpc("admin_unban_user", { p_user_id: userId, p_reason: reason, p_note: noteOrNull(note) ?? undefined }));
  return result.error ? result : { data: null, error: null };
};

/**
 * Exclui pela Edge Function admin-delete-account: o banco recusa conta com assinatura viva (GA023) e a
 * função cancela no gateway antes (mesma regra da exclusão pelo app). Permissão e auditoria no banco.
 */
export const deleteUser: AdminUsersApi["deleteUser"] = async (client, { userId, reason, note }) =>
  invokeAdminFunction(client, "admin-delete-account", { userId, reason, note: noteOrNull(note) });

export const scheduleDeletion: AdminUsersApi["scheduleDeletion"] = async (client, { userId, at, reason, note }) => {
  const result = await runQuery(() =>
    client.rpc("admin_schedule_deletion", { p_user_id: userId, p_at: at, p_reason: reason, p_note: noteOrNull(note) ?? undefined }),
  );
  return result.error ? result : { data: null, error: null };
};

export const cancelDeletion: AdminUsersApi["cancelDeletion"] = async (client, { userId, reason, note }) => {
  const result = await runQuery(() => client.rpc("admin_cancel_deletion", { p_user_id: userId, p_reason: reason, p_note: noteOrNull(note) ?? undefined }));
  return result.error ? result : { data: null, error: null };
};

/** Respostas das Edge Functions do painel: { code } com o ApiErrorCode. */
function isApiErrorCode(code: unknown): code is ApiErrorCode {
  return typeof code === "string" && code in API_ERROR_MESSAGES;
}

/** Chama uma Edge Function do painel com o token do colaborador; erro vem como { code }. */
async function invokeAdminFunction(client: GufClient, name: string, body: Record<string, unknown>): Promise<ApiResult<null>> {
  try {
    const { error } = await client.functions.invoke(name, { body });
    if (!error) return { data: null, error: null };
    const response = (error as { context?: Response }).context;
    const payload = response ? ((await response.json().catch(() => null)) as { code?: unknown } | null) : null;
    return { data: null, error: isApiErrorCode(payload?.code) ? apiError(payload.code) : toApiError(error) };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export const sendPasswordReset: AdminUsersApi["sendPasswordReset"] = async (client, { userId, reason, note }) =>
  invokeAdminFunction(client, "admin-reset-password", { userId, reason, note: noteOrNull(note) });

export const listPlans: AdminUsersApi["listPlans"] = async (client) => {
  const result = await runQuery(() => client.from("plans").select("code, name, is_default, rank").order("rank"));
  if (result.error) return result;
  return { data: (result.data ?? []).map((p) => ({ code: p.code, name: p.name, isDefault: p.is_default, rank: p.rank })), error: null };
};

export const adminUsersApi = {
  searchUsers,
  getUser,
  revealEmail,
  checkHandle,
  updateHandle,
  updateName,
  setPlan,
  unlinkLogin,
  unlinkSocialLogins,
  banUser,
  unbanUser,
  deleteUser,
  scheduleDeletion,
  cancelDeletion,
  sendPasswordReset,
  listPlans,
} satisfies AdminUsersApi;
