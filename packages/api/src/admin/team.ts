import { isStaffRole, type StaffRole } from "@guf/core";
import type { GufClient } from "../client";
import { apiError, toApiError, type ApiResult } from "../result";
import { runQuery } from "./run-query";

/* =====================================================================
 * Contrato — Equipe e auditoria (só papel admin; o banco confere).
 * Convite pela Edge Function admin-invite-staff (cria a conta de trabalho e manda o link).
 * ===================================================================== */

export type StaffStatus = "active" | "invited" | "disabled";

export interface StaffRow {
  userId: string;
  displayName: string;
  email: string;
  role: StaffRole;
  hasVerifiedFactor: boolean;
  status: StaffStatus;
  lastSeenAt: string | null;
  isMe: boolean;
}

export interface AuditEntry {
  id: number;
  occurredAt: string;
  actorId: string | null;
  actorName: string;
  action: string;
  subjectId: string | null;
  subjectLabel: string;
  details: Record<string, unknown>;
}

export interface AuditFilters {
  actorId?: string;
  action?: string;
  from?: string;
  subject?: string;
  beforeId?: number;
}

export const AUDIT_PAGE_SIZE = 30;

type Result<T = null> = Promise<ApiResult<T>>;

export interface StaffTeamApi {
  listStaff: (client: GufClient) => Result<StaffRow[]>;
  setStaffRole: (client: GufClient, input: { userId: string; role: StaffRole }) => Result;
  setStaffDisabled: (client: GufClient, input: { userId: string; disabled: boolean }) => Result;
  inviteStaff: (client: GufClient, input: { email: string; displayName: string; role: StaffRole }) => Result;
  listAudit: (client: GufClient, filters: AuditFilters) => Result<AuditEntry[]>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

export const listStaff: StaffTeamApi["listStaff"] = async (client) => {
  const result = await runQuery(() => client.rpc("admin_list_staff"));
  if (result.error) return result;
  return {
    data: (result.data ?? [])
      .filter((r) => isStaffRole(r.role))
      .map((r) => ({
        userId: r.user_id,
        displayName: r.display_name,
        email: r.email,
        role: r.role as StaffRole,
        hasVerifiedFactor: r.has_verified_factor,
        status: r.status as StaffStatus,
        lastSeenAt: r.last_seen_at,
        isMe: r.is_me,
      })),
    error: null,
  };
};

export const setStaffRole: StaffTeamApi["setStaffRole"] = async (client, { userId, role }) => {
  const result = await runQuery(() => client.rpc("admin_set_staff_role", { p_user_id: userId, p_role: role }));
  return result.error ? result : { data: null, error: null };
};

export const setStaffDisabled: StaffTeamApi["setStaffDisabled"] = async (client, { userId, disabled }) => {
  const result = await runQuery(() => client.rpc("admin_set_staff_disabled", { p_user_id: userId, p_disabled: disabled }));
  return result.error ? result : { data: null, error: null };
};

export const inviteStaff: StaffTeamApi["inviteStaff"] = async (client, input) => {
  try {
    const { data, error } = await client.functions.invoke<{ error?: string }>("admin-invite-staff", { body: input });
    if (!error) return { data: null, error: null };
    const status = (error as { context?: Response }).context?.status;
    if (status === 409) return { data: null, error: apiError("staff_already_member") };
    if (status === 403) return { data: null, error: apiError("staff_forbidden") };
    if (status === 400) return { data: null, error: { ...apiError("unknown"), message: data?.error ?? "Confira o e-mail e o papel." } };
    return { data: null, error: toApiError(error) };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const listAudit: StaffTeamApi["listAudit"] = async (client, filters) => {
  const result = await runQuery(() =>
    client.rpc("admin_list_audit", {
      p_actor_id: filters.actorId,
      p_action: filters.action,
      p_from: filters.from,
      p_subject: filters.subject,
      p_before_id: filters.beforeId,
      p_limit: AUDIT_PAGE_SIZE,
    }),
  );
  if (result.error) return result;
  return {
    data: (result.data ?? []).map((r) => ({
      id: r.id,
      occurredAt: r.occurred_at,
      actorId: r.actor_id,
      actorName: r.actor_name,
      action: r.action,
      subjectId: r.subject_id,
      subjectLabel: r.subject_label,
      details: (r.details ?? {}) as Record<string, unknown>,
    })),
    error: null,
  };
};

export const staffTeamApi = { listStaff, setStaffRole, setStaffDisabled, inviteStaff, listAudit } satisfies StaffTeamApi;
