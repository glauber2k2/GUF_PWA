import {
  AtSign,
  Ban,
  Crown,
  Eye,
  Megaphone,
  Pencil,
  ScrollText,
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
};

export function auditIcon(action: string): LucideIcon {
  return AUDIT_ICONS[action] ?? ScrollText;
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
  if (typeof d.reach === "number") parts.push(`${formatCount(d.reach)} pessoas`);
  return { reason, detail: parts.join(" · ") || "Sem outros detalhes." };
}
