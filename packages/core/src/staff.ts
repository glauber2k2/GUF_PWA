/**
 * Painel de administração: papéis, permissões e textos da auditoria. O banco decide (funções
 * admin_* conferem papel e segundo fator); o painel usa estas regras só para mostrar ou esconder.
 */
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type StaffRole = "viewer" | "support" | "admin";

export const STAFF_ROLES: Record<StaffRole, { label: string; description: string; rank: number }> = {
  viewer: { label: "Leitura", description: "Só consulta contas e comunicados.", rank: 1 },
  support: { label: "Suporte", description: "Edita @ e nome, desvincula login, redefine senha e cria rascunhos.", rank: 2 },
  admin: { label: "Admin", description: "Tudo, incluindo plano, suspensão e exclusão de contas, publicação, auditoria e equipe.", rank: 3 },
};

export type StaffPermission =
  | "view_accounts"
  | "reveal_email"
  | "edit_profile"
  | "unlink_login"
  | "reset_password"
  | "change_plan"
  | "ban_accounts"
  | "delete_accounts"
  | "draft_announcements"
  | "publish_announcements"
  | "view_audit"
  | "manage_team";

/** Papel mínimo de cada ação (igual ao `require_staff` de cada função do banco). */
export const STAFF_PERMISSIONS: Record<StaffPermission, StaffRole> = {
  view_accounts: "viewer",
  reveal_email: "support",
  edit_profile: "support",
  unlink_login: "support",
  reset_password: "support",
  change_plan: "admin",
  ban_accounts: "admin",
  delete_accounts: "admin",
  draft_announcements: "support",
  publish_announcements: "admin",
  view_audit: "admin",
  manage_team: "admin",
};

export function canStaff(role: StaffRole, permission: StaffPermission): boolean {
  return STAFF_ROLES[role].rank >= STAFF_ROLES[STAFF_PERMISSIONS[permission]].rank;
}

export function isStaffRole(value: string): value is StaffRole {
  return value in STAFF_ROLES;
}

export type ChangeReason = "titular_request" | "terms_violation" | "courtesy" | "other";

export const CHANGE_REASONS: Record<ChangeReason, string> = {
  titular_request: "Pedido da pessoa",
  terms_violation: "Violação dos Termos",
  courtesy: "Cortesia/teste",
  other: "Outro",
};

export const REASON_NOTE_LIMITS = { min: 3, max: 200 } as const;

/** Motivo completo para o resumo ("Outro: correção pedida"). */
export function describeReason(reason: ChangeReason | null, note?: string | null): string {
  if (!reason) return note ?? "—";
  return reason === "other" && note ? `${CHANGE_REASONS.other}: ${note}` : CHANGE_REASONS[reason];
}

/** Motivo pronto para enviar: escolhido e, em "Outro", descrito. */
export function isReasonComplete(reason: ChangeReason | null, note: string): boolean {
  if (!reason) return false;
  return reason !== "other" || note.trim().length >= REASON_NOTE_LIMITS.min;
}

export const LOGIN_PROVIDERS: Record<string, string> = {
  email: "E-mail e senha",
  google: "Google",
  apple: "Apple",
};

export function loginProviderLabel(provider: string): string {
  return LOGIN_PROVIDERS[provider] ?? provider;
}

/** Ação da auditoria → texto da tela. Ação nova no banco = linha nova aqui. */
export const AUDIT_ACTIONS: Record<string, string> = {
  staff_viewed_user: "Abriu a conta",
  staff_revealed_email: "Viu o e-mail",
  staff_changed_plan: "Mudou o plano",
  staff_changed_handle: "Mudou o @",
  staff_changed_name: "Mudou o nome",
  staff_unlinked_identity: "Desvinculou login",
  staff_member_added: "Adicionou colaborador",
  staff_member_role_changed: "Mudou papel",
  staff_member_disabled: "Desativou colaborador",
  staff_member_enabled: "Reativou colaborador",
  announcement_published: "Publicou comunicado",
  announcement_ended: "Encerrou comunicado",
  plan_granted: "Liberou plano",
  plan_revoked: "Encerrou plano",
  staff_banned_user: "Suspendeu a conta",
  staff_unbanned_user: "Encerrou a suspensão",
  staff_deleted_account: "Excluiu a conta",
  staff_scheduled_deletion: "Agendou a exclusão",
  staff_cancelled_deletion: "Cancelou a exclusão agendada",
  staff_sent_password_reset: "Enviou link de senha nova",
  scheduled_deletion_executed: "Exclusão agendada executada",
  account_deleted: "Conta excluída",
};

/** Prazos da suspensão no painel ("custom" = data escolhida; "indefinite" = até alguém encerrar). */
export type BanDuration = "1d" | "7d" | "30d" | "custom" | "indefinite";

export const BAN_DURATIONS: Record<BanDuration, { label: string; days?: number }> = {
  "1d": { label: "1 dia", days: 1 },
  "7d": { label: "7 dias", days: 7 },
  "30d": { label: "30 dias", days: 30 },
  custom: { label: "Até uma data" },
  indefinite: { label: "Indeterminado" },
};

/**
 * Fim da suspensão em ISO.
 * @param customEnd instante escolhido no campo de data (só em "custom")
 * @returns null = indeterminado; undefined = "custom" sem data
 */
export function banEndsAt(duration: BanDuration, customEnd: string | null, now: Date = new Date()): string | null | undefined {
  if (duration === "indefinite") return null;
  if (duration === "custom") return customEnd ?? undefined;
  const end = new Date(now);
  end.setDate(end.getDate() + (BAN_DURATIONS[duration].days ?? 0));
  return end.toISOString();
}

/** "Suspensa até 12 nov 2026, 14:00" · "Suspensa por tempo indeterminado". */
export function banStatusText(endsAt: string | null): string {
  return endsAt ? `Suspensa até ${formatStaffDateTime(endsAt)}` : "Suspensa por tempo indeterminado";
}

/** "Exclusão agendada para 12 nov 2026, 14:00". */
export function deletionStatusText(scheduledFor: string): string {
  return `Exclusão agendada para ${formatStaffDateTime(scheduledFor)}`;
}

export type DocumentAcceptance = "accepted" | "outdated" | "not_accepted";

export const DOCUMENT_ACCEPTANCE_LABELS: Record<DocumentAcceptance, string> = {
  accepted: "Aceito",
  outdated: "Versão nova pendente",
  not_accepted: "Não aceito",
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTIONS[action] ?? action;
}

export const MFA_CODE_LENGTH = 6;

export function isMfaCode(value: string): boolean {
  return new RegExp(`^\\d{${MFA_CODE_LENGTH}}$`).test(value);
}

/** "Hoje, 10:42" · "Ontem, 18:03" · "20 out, 14:51" · "3 set 2025, 9:12". */
export function formatStaffDateTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = format(date, "H:mm");
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) return `Hoje, ${time}`;
  if (days === 1) return `Ontem, ${time}`;
  const pattern = date.getFullYear() === now.getFullYear() ? "d MMM" : "d MMM yyyy";
  return `${format(date, pattern, { locale: ptBR }).replace(".", "")}, ${time}`;
}

/** "18.420" */
export function formatCount(value: number): string {
  return value.toLocaleString("pt-BR");
}

/** Parte do total em % inteiro (0 quando não há base). */
export function shareOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
