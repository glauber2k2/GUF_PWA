import { ShieldCheck } from "lucide-react";
import type { User } from "@guf/api";
import { Icon } from "@/shared/components/ds";

/** Nome gravado no cadastro (e-mail: `name`; Google: `full_name`/`name`). */
function userDisplayName(user: User): string | null {
  const metadata = user.user_metadata as { name?: unknown; full_name?: unknown } | undefined;
  const name = metadata?.name ?? metadata?.full_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/** Conta que está sendo recuperada pelo link e o selo "Link válido" (a pessoa confere que é a conta certa). */
export function RecoveryAccountCard({ user }: { user: User }) {
  const name = userDisplayName(user);
  const email = user.email ?? "";
  const initial = (name ?? email).charAt(0).toUpperCase();
  return (
    <div className="flex animate-guf-rise items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-3 [animation-delay:100ms]">
      <span aria-hidden="true" className="grid size-9 flex-none place-items-center rounded-pill bg-accent/16 text-[15px] font-bold text-accent-text">
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        {name && <span className="text-sm font-semibold">{name}</span>}
        <span className="truncate text-[13px] text-fg-muted">{email}</span>
      </div>
      <span className="inline-flex flex-none items-center gap-1 rounded-pill bg-success/14 px-2 py-1 text-xs font-semibold text-success">
        <Icon icon={ShieldCheck} size={13} />
        Link válido
      </span>
    </div>
  );
}
