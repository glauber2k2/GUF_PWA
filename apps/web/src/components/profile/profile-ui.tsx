import type { ReactNode } from "react";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ds";
import { cn } from "@/lib/utils";

/** Peças comuns das seções do Perfil (lista agrupada em cartão, ícone de linha, linha tocável). */

export function ProfileSection({ id, title, className, children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("flex animate-guf-rise flex-col gap-2", className)}>
      <h2 id={id} className="mt-2 ml-1 scroll-mt-[calc(64px+env(safe-area-inset-top))] text-lg leading-6 font-semibold tracking-[-0.015em]">
        {title}
      </h2>
      <div className="flex flex-col rounded-lg border border-border bg-surface shadow-e1">{children}</div>
    </section>
  );
}

export function RowIcon({ icon, tone = "neutral" }: { icon: LucideIcon; tone?: "neutral" | "danger" }) {
  return (
    <span
      className={cn(
        "grid size-9 flex-none place-items-center rounded-[10px]",
        tone === "danger" ? "bg-danger/16 text-danger" : "bg-surface-3 text-fg-secondary",
      )}
    >
      <Icon icon={icon} size={18} />
    </span>
  );
}

export interface RowButtonProps {
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Elemento à direita (padrão: seta). */
  trailing?: ReactNode;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/** Linha tocável de uma seção (≥ 56px). */
export function RowButton({ icon, title, subtitle, trailing, tone = "neutral", disabled, onClick, className }: RowButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md bg-transparent p-2 text-left transition-colors duration-150 ease-standard",
        tone === "danger" ? "text-danger hover:bg-danger/10" : "text-fg hover:bg-surface-3",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
        className,
      )}
    >
      <RowIcon icon={icon} tone={tone} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] leading-5 font-semibold">{title}</span>
        {subtitle && <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">{subtitle}</span>}
      </span>
      {trailing ?? <Icon icon={ChevronRight} size={18} className={tone === "danger" ? undefined : "text-fg-muted"} />}
    </button>
  );
}

/** Divisor entre linhas de uma seção. */
export function RowGroup({ first = false, padded = false, className, children }: { first?: boolean; padded?: boolean; className?: string; children: ReactNode }) {
  return <div className={cn(padded ? "px-4 py-3.5" : "px-2 py-1.5", !first && "border-t border-border", className)}>{children}</div>;
}
