import type { ChangeReason } from "@guf/core";
import type { GufClient } from "../client";
import type { ApiResult } from "../result";
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

export interface AdminUserDetail {
  userId: string;
  name: string | null;
  handle: string | null;
  isPrivate: boolean;
  maskedEmail: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  hasPassword: boolean;
  logins: Array<{ provider: string; createdAt: string }>;
  plan: { code: string; name: string; isDefault: boolean };
  planGrants: AdminPlanGrant[];
  followers: number;
  following: number;
  workouts: number;
  documents: Array<{ docType: string; version: string; acceptedAt: string }>;
  /** Só o sim/não (nunca as medidas); null quando o papel não vê (Leitura). */
  healthConsent: boolean | null;
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
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface AdminUsersApi {
  searchUsers: (client: GufClient, query: string) => Result<AdminUserSummary[]>;
  getUser: (client: GufClient, userId: string) => Result<AdminUserDetail>;
  revealEmail: (client: GufClient, userId: string) => Result<string>;
  checkHandle: (client: GufClient, input: { userId: string; handle: string }) => Result<HandleAvailability>;
  updateHandle: (client: GufClient, input: ReasonInput & { userId: string; handle: string }) => Result;
  updateName: (client: GufClient, input: ReasonInput & { userId: string; name: string }) => Result;
  setPlan: (client: GufClient, input: ReasonInput & { userId: string; planCode: string; validUntil: string | null }) => Result;
  unlinkLogin: (client: GufClient, input: { userId: string; provider: string; note: string }) => Result;
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
  documents: Array<{ doc_type: string; version: string; accepted_at: string }>;
  health_consent: boolean | null;
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
    documents: row.documents.map((d) => ({ docType: d.doc_type, version: d.version, acceptedAt: d.accepted_at })),
    healthConsent: row.health_consent,
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

export const setPlan: AdminUsersApi["setPlan"] = async (client, { userId, planCode, validUntil, reason, note }) => {
  const result = await runQuery(() =>
    client.rpc("admin_set_plan", {
      p_user_id: userId,
      p_plan_code: planCode,
      // null = sem validade (o tipo gerado não aceita null em argumentos com padrão)
      p_valid_until: validUntil as string,
      p_reason: reason,
      p_note: noteOrNull(note) ?? undefined,
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

export const listPlans: AdminUsersApi["listPlans"] = async (client) => {
  const result = await runQuery(() => client.from("plans").select("code, name, is_default, rank").order("rank"));
  if (result.error) return result;
  return { data: (result.data ?? []).map((p) => ({ code: p.code, name: p.name, isDefault: p.is_default })), error: null };
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
  listPlans,
} satisfies AdminUsersApi;
