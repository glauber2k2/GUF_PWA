import {
  AtSign,
  Ban,
  CalendarClock,
  CalendarX,
  Crown,
  Dumbbell,
  KeyRound,
  Eye,
  Megaphone,
  Pencil,
  ScrollText,
  ShieldCheck,
  Trash2,
  Unlink,
  UserCog,
  UserPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import type { AuditEntry } from "@guf/api/admin";
import {
  ANNOUNCEMENT_FORMATS,
  describeReason,
  formatCount,
  formatStaffDateTime,
  loginProviderLabel,
  STAFF_ROLES,
  isStaffRole,
  type AnnouncementFormat,
  type ChangeReason,
} from "@guf/core";

/** Ícone por ação (texto da ação em packages/core: AUDIT_ACTIONS). */
export const AUDIT_ICONS: Record<string, LucideIcon> = {
  staff_viewed_user: Eye,
  staff_revealed_email: Eye,
  staff_changed_plan: Crown,
  staff_changed_handle: AtSign,
  staff_changed_name: Pencil,
  staff_unlinked_identity: Unlink,
  staff_member_added: UserPlus,
  staff_member_role_changed: UserCog,
  staff_member_disabled: UserX,
  staff_member_enabled: UserPlus,
  announcement_published: Megaphone,
  announcement_ended: Ban,
  staff_banned_user: Ban,
  staff_unbanned_user: ShieldCheck,
  staff_deleted_account: Trash2,
  account_deleted: Trash2,
  scheduled_deletion_executed: Trash2,
  staff_scheduled_deletion: CalendarClock,
  staff_cancelled_deletion: CalendarX,
  staff_sent_password_reset: KeyRound,
  staff_created_exercises: Dumbbell,
};

export function auditIcon(action: string): LucideIcon {
  return AUDIT_ICONS[action] ?? ScrollText;
}

/** "12 cadastrados · 3 já existiam · por arquivo" (cadastro no catálogo de exercícios). */
function exerciseCreationDetail(created: number, skipped: unknown, source: unknown): string {
  const parts = [`${formatCount(created)} cadastrados`];
  if (typeof skipped === "number" && skipped > 0) parts.push(`${formatCount(skipped)} já existiam`);
  if (source === "file") parts.push("por arquivo");
  return parts.join(" · ");
}

/** Motivo e detalhe a partir dos metadados gravados (nunca valores pessoais antigos). */
export function auditDetail(entry: AuditEntry): { reason: string; detail: string } {
  const d = entry.details;
  const reason = typeof d.reason === "string" ? describeReason(d.reason as ChangeReason, typeof d.note === "string" ? d.note : null) : "—";
  const parts: string[] = [];
  if (typeof d.plan === "string") parts.push(`Plano: ${d.plan}${typeof d.valid_until === "string" ? ` até ${d.valid_until.slice(0, 10)}` : ""}`);
  if (typeof d.provider === "string") parts.push(`Login: ${loginProviderLabel(d.provider)}`);
  if (typeof d.role === "string" && isStaffRole(d.role)) parts.push(`Papel: ${STAFF_ROLES[d.role].label}`);
  if (typeof d.format === "string" && d.format in ANNOUNCEMENT_FORMATS) parts.push(`Formato: ${ANNOUNCEMENT_FORMATS[d.format as AnnouncementFormat].label}`);
  if ("ends_at" in d) parts.push(typeof d.ends_at === "string" ? `Suspensa até ${formatStaffDateTime(d.ends_at)}` : "Suspensa por tempo indeterminado");
  if (typeof d.scheduled_for === "string") parts.push(`Exclusão em ${formatStaffDateTime(d.scheduled_for)}`);
  if (typeof d.created === "number") parts.push(exerciseCreationDetail(d.created, d.skipped, d.source));
  if (typeof d.reach === "number") parts.push(`${formatCount(d.reach)} pessoas`);
  return { reason, detail: parts.join(" · ") || "Sem outros detalhes." };
}
