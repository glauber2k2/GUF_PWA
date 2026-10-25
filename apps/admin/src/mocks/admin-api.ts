/**
 * MOCKS do painel — mesma assinatura dos contratos de @guf/api/admin (validado com `satisfies`).
 * Só desenvolvimento com ?estado=. Conferem o papel como o banco (canStaff) e respondem com os
 * mesmos códigos de erro.
 */
import { apiError, type ApiError, type ApiResult, type GufClient } from "@guf/api";
import {
  CATALOG_PAGE_SIZE,
  type AnnouncementsAdminApi,
  type AdminUsersApi,
  type ExerciseCatalogAdminApi,
  type StaffAccess,
  type StaffSessionApi,
  type StaffTeamApi,
} from "@guf/api/admin";
import { canStaff, catalogNameKey, normalizeHandle, type StaffPermission } from "@guf/core";
import { getAdminMockScenario, getMockDb, MOCK_ME_ID } from "@/mocks/admin-data";

const LATENCY_MS = 350;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

function ignoreClient(client: GufClient) {
  void client;
}

function fail<T>(error: ApiError): ApiResult<T> {
  return { data: null, error };
}

/** Mesmo portão das funções admin_*: erro forçado, papel mínimo. */
async function guard(client: GufClient, permission: StaffPermission): Promise<ApiError | null> {
  ignoreClient(client);
  await wait();
  const { forceError, role } = getAdminMockScenario();
  if (forceError) return apiError("network_error");
  return canStaff(role, permission) ? null : apiError("staff_forbidden");
}

function audit(action: string, subjectId: string | null, subjectLabel: string, details: Record<string, unknown> = {}) {
  const db = getMockDb();
  db.audit.unshift({ id: (db.audit[0]?.id ?? 0) + 1, occurredAt: new Date().toISOString(), actorId: MOCK_ME_ID, actorName: "Ana Ribeiro", action, subjectId, subjectLabel, details });
}

// ---------------------------------------------------------------------------------------------

export const mockStaffSessionApi = {
  async signIn(client, { password }) {
    ignoreClient(client);
    await wait();
    return password.length < 8 ? fail(apiError("invalid_credentials")) : { data: null, error: null };
  },
  async signInWithGoogle(client) {
    ignoreClient(client);
    await wait();
    // Na demonstração não sai para o Google: volta para o passo do código.
    return { data: { url: "/entrar/codigo/?estado=admin,codigo" }, error: null };
  },
  async requestPasswordReset(client) {
    ignoreClient(client);
    await wait();
    return { data: null, error: null };
  },
  async signOut(client) {
    ignoreClient(client);
    return { data: null, error: null };
  },
  async getStaffAccess(client) {
    ignoreClient(client);
    await wait();
    const { access, role } = getAdminMockScenario();
    const staff = { userId: MOCK_ME_ID, displayName: "Ana Ribeiro", email: "ana.ribeiro@guf.app", role };
    const byAccess: Record<typeof access, StaffAccess> = {
      ready: { status: "ready", staff },
      signed_out: { status: "signed_out" },
      not_staff: { status: "not_staff", email: "lucas.ferreira@gmail.com" },
      mfa_setup: { status: "mfa_setup", staff },
      mfa_challenge: { status: "mfa_challenge", staff },
    };
    return { data: byAccess[access], error: null };
  },
  async enrollTotp(client) {
    ignoreClient(client);
    await wait();
    return { data: { factorId: "mock-factor", qrCode: "", secret: "JBSWY3DPEHPK3PXP" }, error: null };
  },
  async verifyTotp(client, { code }) {
    ignoreClient(client);
    await wait();
    return code === "000000" ? fail(apiError("mfa_code_invalid")) : { data: null, error: null };
  },
  async setSessionFromLink(client) {
    ignoreClient(client);
    return { data: null, error: null };
  },
  async setPassword(client) {
    ignoreClient(client);
    await wait();
    return { data: null, error: null };
  },
} satisfies StaffSessionApi;

// ---------------------------------------------------------------------------------------------

function findPerson(userId: string) {
  return getMockDb().people.find((p) => p.userId === userId);
}

export const mockAdminUsersApi = {
  async searchUsers(client, query) {
    const denied = await guard(client, "view_accounts");
    if (denied) return fail(denied);
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (q.length < 2 || getAdminMockScenario().empty) return { data: [], error: null };
    const found = getMockDb().people.filter((p) =>
      [p.name ?? "", p.handle ?? "", p.maskedEmail ?? "", p.userId].some((field) => field.toLowerCase().includes(q)),
    );
    return {
      data: found.map((p) => ({
        userId: p.userId,
        name: p.name,
        handle: p.handle,
        maskedEmail: p.maskedEmail,
        planCode: p.plan.code,
        planName: p.plan.name,
        isDefaultPlan: p.plan.isDefault,
        createdAt: p.createdAt,
        isPrivate: p.isPrivate,
        isBanned: p.ban !== null,
        banEndsAt: p.ban?.endsAt ?? null,
        deletionScheduledFor: p.deletion?.scheduledFor ?? null,
      })),
      error: null,
    };
  },
  async getUser(client, userId) {
    const denied = await guard(client, "view_accounts");
    if (denied) return fail(denied);
    const found = getMockDb().people.find((p) => p.userId === userId);
    if (!found) return fail(apiError("account_not_found"));
    const healthConsent = canStaff(getAdminMockScenario().role, "edit_profile") ? found.healthConsent : null;
    return { data: { ...found, healthConsent }, error: null };
  },
  async revealEmail(client, userId) {
    const denied = await guard(client, "reveal_email");
    if (denied) return fail(denied);
    const found = getMockDb().people.find((p) => p.userId === userId);
    if (!found) return fail(apiError("account_not_found"));
    audit("staff_revealed_email", userId, `@${found.handle}`);
    return { data: (found.maskedEmail ?? "").replace("•••", "rina.costa"), error: null };
  },
  async checkHandle(client, { userId, handle }) {
    const denied = await guard(client, "edit_profile");
    if (denied) return fail(denied);
    const clean = normalizeHandle(handle);
    if (!/^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/.test(clean)) return { data: "invalid", error: null };
    const owner = getMockDb().people.find((p) => p.handle === clean);
    if (!owner) return { data: clean === "marina" ? "taken" : "available", error: null };
    return { data: owner.userId === userId ? "same" : "taken", error: null };
  },
  async updateHandle(client, { userId, handle, reason }) {
    const denied = await guard(client, "edit_profile");
    if (denied) return fail(denied);
    const found = getMockDb().people.find((p) => p.userId === userId);
    if (!found) return fail(apiError("account_not_found"));
    found.handle = normalizeHandle(handle);
    audit("staff_changed_handle", userId, `@${found.handle}`, { reason, field: "handle" });
    return { data: null, error: null };
  },
  async updateName(client, { userId, name, reason }) {
    const denied = await guard(client, "edit_profile");
    if (denied) return fail(denied);
    const found = getMockDb().people.find((p) => p.userId === userId);
    if (!found) return fail(apiError("account_not_found"));
    found.name = name.trim();
    audit("staff_changed_name", userId, `@${found.handle}`, { reason, field: "name" });
    return { data: null, error: null };
  },
  async setPlan(client, { userId, planCode, validUntil, reason, notify }) {
    const denied = await guard(client, "change_plan");
    if (denied) return fail(denied);
    const found = getMockDb().people.find((p) => p.userId === userId);
    if (!found) return fail(apiError("account_not_found"));
    found.plan = planCode === "pro" ? { code: "pro", name: "Pro", isDefault: false } : { code: "free", name: "Free", isDefault: true };
    if (planCode === "pro") {
      found.planGrants.unshift({ id: crypto.randomUUID(), planCode, planName: "Pro", source: "manual", validFrom: new Date().toISOString(), validUntil, revokedAt: null });
    }
    audit("staff_changed_plan", userId, `@${found.handle}`, { reason, plan: planCode, notified: notify });
    return { data: null, error: null };
  },
  async unlinkLogin(client, { userId, provider }) {
    const denied = await guard(client, "unlink_login");
    if (denied) return fail(denied);
    const found = getMockDb().people.find((p) => p.userId === userId);
    if (!found) return fail(apiError("account_not_found"));
    const remaining = found.logins.filter((l) => l.provider !== provider && (l.provider !== "email" || found.hasPassword));
    if (remaining.length === 0) return fail(apiError("only_login_method"));
    found.logins = found.logins.filter((l) => l.provider !== provider);
    audit("staff_unlinked_identity", userId, `@${found.handle}`, { reason: "titular_request", provider });
    return { data: null, error: null };
  },
  async unlinkSocialLogins(client, { userId }) {
    const denied = await guard(client, "unlink_login");
    if (denied) return fail(denied);
    const found = findPerson(userId);
    if (!found) return fail(apiError("account_not_found"));
    const social = found.logins.filter((l) => l.provider !== "email");
    if (social.length === 0) return fail(apiError("nothing_changed"));
    if (!found.hasPassword || !found.logins.some((l) => l.provider === "email")) return fail(apiError("only_login_method"));
    found.logins = found.logins.filter((l) => l.provider === "email");
    social.forEach((l) => audit("staff_unlinked_identity", userId, `@${found.handle}`, { reason: "titular_request", provider: l.provider }));
    return { data: social.length, error: null };
  },
  async banUser(client, { userId, endsAt, reason, note }) {
    const denied = await guard(client, "ban_accounts");
    if (denied) return fail(denied);
    const found = findPerson(userId);
    if (!found) return fail(apiError("account_not_found"));
    if (found.isStaff) return fail(apiError("account_is_staff"));
    if (endsAt && endsAt <= new Date().toISOString()) return fail(apiError("date_in_past"));
    found.ban = { endsAt, reason, note: note.trim() || null, createdAt: new Date().toISOString() };
    audit("staff_banned_user", userId, `@${found.handle}`, { reason, ends_at: endsAt });
    return { data: null, error: null };
  },
  async unbanUser(client, { userId, reason }) {
    const denied = await guard(client, "ban_accounts");
    if (denied) return fail(denied);
    const found = findPerson(userId);
    if (!found) return fail(apiError("account_not_found"));
    if (!found.ban) return fail(apiError("nothing_changed"));
    found.ban = null;
    audit("staff_unbanned_user", userId, `@${found.handle}`, { reason });
    return { data: null, error: null };
  },
  async deleteUser(client, { userId, reason }) {
    const denied = await guard(client, "delete_accounts");
    if (denied) return fail(denied);
    const db = getMockDb();
    const found = findPerson(userId);
    if (!found) return fail(apiError("account_not_found"));
    if (found.isStaff) return fail(apiError("account_is_staff"));
    db.people = db.people.filter((p) => p.userId !== userId);
    audit("staff_deleted_account", userId, "Conta excluída", { reason });
    return { data: null, error: null };
  },
  async scheduleDeletion(client, { userId, at, reason, note }) {
    const denied = await guard(client, "delete_accounts");
    if (denied) return fail(denied);
    const found = findPerson(userId);
    if (!found) return fail(apiError("account_not_found"));
    if (found.isStaff) return fail(apiError("account_is_staff"));
    if (at <= new Date().toISOString()) return fail(apiError("date_in_past"));
    found.deletion = { scheduledFor: at, reason, note: note.trim() || null, createdAt: new Date().toISOString(), lastError: null };
    audit("staff_scheduled_deletion", userId, `@${found.handle}`, { reason, scheduled_for: at });
    return { data: null, error: null };
  },
  async cancelDeletion(client, { userId, reason }) {
    const denied = await guard(client, "delete_accounts");
    if (denied) return fail(denied);
    const found = findPerson(userId);
    if (!found) return fail(apiError("account_not_found"));
    if (!found.deletion) return fail(apiError("nothing_changed"));
    found.deletion = null;
    audit("staff_cancelled_deletion", userId, `@${found.handle}`, { reason });
    return { data: null, error: null };
  },
  async sendPasswordReset(client, { userId, reason }) {
    const denied = await guard(client, "reset_password");
    if (denied) return fail(denied);
    const found = findPerson(userId);
    if (!found) return fail(apiError("account_not_found"));
    if (found.isStaff) return fail(apiError("account_is_staff"));
    if (found.ban) return fail(apiError("account_banned"));
    audit("staff_sent_password_reset", userId, `@${found.handle}`, { reason });
    return { data: null, error: null };
  },
  async listPlans(client) {
    ignoreClient(client);
    return {
      data: [
        { code: "free", name: "Free", isDefault: true, rank: 0 },
        { code: "pro", name: "Pro", isDefault: false, rank: 20 },
      ],
      error: null,
    };
  },
} satisfies AdminUsersApi;

// ---------------------------------------------------------------------------------------------

export const mockAnnouncementsAdminApi = {
  async listAnnouncements(client) {
    const denied = await guard(client, "view_accounts");
    if (denied) return fail(denied);
    if (getAdminMockScenario().empty) return { data: [], error: null };
    return { data: getMockDb().announcements.map((a) => a.summary), error: null };
  },
  async getAnnouncement(client, id) {
    const denied = await guard(client, "view_accounts");
    if (denied) return fail(denied);
    const found = getMockDb().announcements.find((a) => a.summary.id === id);
    if (!found) return fail(apiError("announcement_not_found"));
    const { summary } = found;
    return {
      data: {
        id,
        draft: found.draft,
        state: summary.state,
        targetIds: found.targetIds,
        reachEstimate: summary.reachEstimate,
        seenCount: summary.seenCount,
        dismissedCount: summary.dismissedCount,
        ctaCount: summary.ctaCount,
        publishedAt: found.publishedAt,
        publishedByName: found.publishedAt ? "Ana Ribeiro" : null,
      },
      error: null,
    };
  },
  async saveAnnouncement(client, { id, draft, targetIds }) {
    const denied = await guard(client, "draft_announcements");
    if (denied) return fail(denied);
    const db = getMockDb();
    const existing = id ? db.announcements.find((a) => a.summary.id === id) : undefined;
    if (existing && existing.summary.state !== "draft") return fail(apiError("announcement_not_found"));
    const known = new Set(db.people.map((p) => p.userId));
    const kept = targetIds.filter((t) => known.has(t));
    const newId = existing?.summary.id ?? crypto.randomUUID();
    const summary = {
      id: newId,
      title: draft.title,
      tone: draft.tone,
      format: draft.format,
      audience: draft.audience,
      purpose: draft.purpose,
      state: "draft" as const,
      startsAt: draft.startsAt,
      endsAt: draft.endsAt,
      reachEstimate: null,
      seenCount: 0,
      dismissedCount: 0,
      ctaCount: 0,
      targetsCount: kept.length,
      updatedAt: new Date().toISOString(),
    };
    if (existing) Object.assign(existing, { summary, draft, targetIds: kept });
    else db.announcements.unshift({ summary, draft, targetIds: kept, publishedAt: null });
    return { data: { id: newId, targetsFound: kept.length, targetsIgnored: targetIds.length - kept.length }, error: null };
  },
  async countAudience(client, { audience, targetIds }) {
    const denied = await guard(client, "view_accounts");
    if (denied) return fail(denied);
    const factors: Record<string, number> = { plans: 0.62, created: 0.0415, visibility: 0.28, health_consent: 0.33 };
    if (audience.rules.some((r) => r.type === "ids")) return { data: targetIds.length, error: null };
    const reach = audience.rules.reduce((total, rule) => total * (factors[rule.type] ?? 1), 48230);
    return { data: Math.max(10, Math.round(reach / 10) * 10), error: null };
  },
  async publishAnnouncement(client, id) {
    const denied = await guard(client, "publish_announcements");
    if (denied) return fail(denied);
    const found = getMockDb().announcements.find((a) => a.summary.id === id);
    if (!found || found.summary.state !== "draft") return fail(apiError("announcement_not_found"));
    if (!found.draft.title || !found.draft.body || !found.draft.endsAt) return fail(apiError("announcement_invalid"));
    const startsLater = found.draft.startsAt && found.draft.startsAt > new Date().toISOString();
    found.summary = { ...found.summary, state: startsLater ? "scheduled" : "active", reachEstimate: 1240, startsAt: found.draft.startsAt ?? new Date().toISOString() };
    found.publishedAt = new Date().toISOString();
    audit("announcement_published", null, "—", { format: found.draft.format });
    return { data: null, error: null };
  },
  async endAnnouncement(client, id) {
    const denied = await guard(client, "publish_announcements");
    if (denied) return fail(denied);
    const found = getMockDb().announcements.find((a) => a.summary.id === id);
    if (!found) return fail(apiError("announcement_not_found"));
    found.summary = { ...found.summary, state: "ended" };
    audit("announcement_ended", null, "—");
    return { data: null, error: null };
  },
  async duplicateAnnouncement(client, id) {
    const denied = await guard(client, "draft_announcements");
    if (denied) return fail(denied);
    const db = getMockDb();
    const found = db.announcements.find((a) => a.summary.id === id);
    if (!found) return fail(apiError("announcement_not_found"));
    const newId = crypto.randomUUID();
    const draft = { ...found.draft, startsAt: null, endsAt: null };
    db.announcements.unshift({
      draft,
      targetIds: [...found.targetIds],
      publishedAt: null,
      summary: { ...found.summary, id: newId, state: "draft", reachEstimate: null, seenCount: 0, dismissedCount: 0, ctaCount: 0, startsAt: null, endsAt: null },
    });
    return { data: newId, error: null };
  },
} satisfies AnnouncementsAdminApi;

// ---------------------------------------------------------------------------------------------

export const mockStaffTeamApi = {
  async listStaff(client) {
    const denied = await guard(client, "manage_team");
    if (denied) return fail(denied);
    return { data: getMockDb().staff, error: null };
  },
  async setStaffRole(client, { userId, role }) {
    const denied = await guard(client, "manage_team");
    if (denied) return fail(denied);
    const found = getMockDb().staff.find((s) => s.userId === userId);
    if (!found || found.isMe) return fail(apiError("staff_change_blocked"));
    found.role = role;
    audit("staff_member_role_changed", userId, found.displayName, { role });
    return { data: null, error: null };
  },
  async setStaffDisabled(client, { userId, disabled }) {
    const denied = await guard(client, "manage_team");
    if (denied) return fail(denied);
    const found = getMockDb().staff.find((s) => s.userId === userId);
    if (!found || found.isMe) return fail(apiError("staff_change_blocked"));
    found.status = disabled ? "disabled" : "active";
    audit(disabled ? "staff_member_disabled" : "staff_member_enabled", userId, found.displayName);
    return { data: null, error: null };
  },
  async inviteStaff(client, { email, displayName, role }) {
    const denied = await guard(client, "manage_team");
    if (denied) return fail(denied);
    const db = getMockDb();
    if (db.staff.some((s) => s.email === email)) return fail(apiError("staff_already_member"));
    db.staff.push({ userId: crypto.randomUUID(), displayName, email, role, hasVerifiedFactor: false, status: "invited", lastSeenAt: null, isMe: false });
    return { data: null, error: null };
  },
  async listAudit(client, filters) {
    const denied = await guard(client, "view_audit");
    if (denied) return fail(denied);
    if (getAdminMockScenario().empty) return { data: [], error: null };
    const subject = filters.subject?.trim().toLowerCase();
    const rows = getMockDb().audit.filter(
      (a) =>
        (!filters.actorId || a.actorId === filters.actorId) &&
        (!filters.action || a.action === filters.action) &&
        (!filters.from || a.occurredAt >= filters.from) &&
        (!filters.beforeId || a.id < filters.beforeId) &&
        (!subject || a.subjectLabel.toLowerCase().includes(subject)),
    );
    return { data: rows, error: null };
  },
} satisfies StaffTeamApi;

export const mockExerciseCatalogAdminApi = {
  async listCatalogExercises(client, filters) {
    const denied = await guard(client, "view_accounts");
    if (denied) return fail(denied);
    if (getAdminMockScenario().empty) return { data: { items: [], total: 0 }, error: null };
    const query = catalogNameKey(filters.query ?? "");
    const groups = filters.muscleGroups ?? [];
    const rows = getMockDb()
      .catalog.filter((e) => (!query || catalogNameKey(e.name).includes(query)) && (groups.length === 0 || groups.includes(e.muscleGroup)))
      .sort((a, b) => catalogNameKey(a.name).localeCompare(catalogNameKey(b.name)));
    const offset = filters.offset ?? 0;
    return { data: { items: rows.slice(offset, offset + CATALOG_PAGE_SIZE), total: rows.length }, error: null };
  },
  async findExistingCatalogNames(client, { names }) {
    const denied = await guard(client, "view_accounts");
    if (denied) return fail(denied);
    const existing = new Set(getMockDb().catalog.map((e) => catalogNameKey(e.name)));
    return { data: names.map(catalogNameKey).filter((key) => existing.has(key)), error: null };
  },
  async createCatalogExercises(client, { exercises, source }) {
    const denied = await guard(client, "manage_exercises");
    if (denied) return fail(denied);
    const db = getMockDb();
    const keys = new Set(db.catalog.map((e) => catalogNameKey(e.name)));
    const created: string[] = [];
    const duplicates: string[] = [];
    for (const exercise of exercises) {
      const key = catalogNameKey(exercise.name);
      if (keys.has(key)) {
        duplicates.push(exercise.name);
        continue;
      }
      keys.add(key);
      created.push(exercise.name);
      db.catalog.push({ id: crypto.randomUUID(), name: exercise.name, muscleGroup: exercise.muscleGroup, equipment: exercise.equipment, createdAt: new Date().toISOString() });
    }
    if (created.length > 0) audit("staff_created_exercises", null, "Catálogo de exercícios", { created: created.length, skipped: duplicates.length, source });
    return { data: { created, duplicates }, error: null };
  },
} satisfies ExerciseCatalogAdminApi;
