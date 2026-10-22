import { Eye, FlaskConical, Headset, Server, ShieldCheck, type LucideIcon } from "lucide-react";
import { STAFF_ROLES, type StaffRole } from "@guf/core";
import { cn, Icon, Logo } from "@guf/ui";
import { ADMIN_ENVIRONMENT } from "@/shared/helpers/environment";

export const ROLE_ICONS: Record<StaffRole, LucideIcon> = { viewer: Eye, support: Headset, admin: ShieldCheck };

const PILL = "inline-flex h-7 items-center gap-1.5 rounded-pill border px-2.5 text-xs font-semibold";

/** Produção em vermelho (cuidado: dados reais); Teste neutro. */
export function EnvironmentBadge({ className }: { className?: string }) {
  const isProd = ADMIN_ENVIRONMENT === "prod";
  return (
    <span className={cn(PILL, isProd ? "border-danger/35 bg-danger/12 text-danger" : "border-border-strong bg-surface-3 text-fg-secondary", className)}>
      <Icon icon={isProd ? Server : FlaskConical} size={13} />
      {isProd ? "Produção" : "Teste"}
    </span>
  );
}

export function RoleBadge({ role, className }: { role: StaffRole; className?: string }) {
  return (
    <span className={cn(PILL, "border-border-strong text-fg-secondary", className)}>
      <Icon icon={ROLE_ICONS[role]} size={13} />
      {STAFF_ROLES[role].label}
    </span>
  );
}

/** Marca do painel: logo do guf + "admin". */
export function AdminWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Logo className="h-6" />
      <span className="border-l border-border-strong pl-2.5 text-[13px] font-semibold text-fg-muted">admin</span>
    </span>
  );
}
