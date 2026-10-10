import type { CSSProperties, ReactNode } from "react";
import { CircleAlert, CircleCheck, Dumbbell, Info, WifiOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./brand";

const BANNER_TONES = {
  warning: {
    icon: WifiOff,
    role: "status",
    text: "text-warning",
    box: "bg-[color-mix(in_oklab,var(--warning)_14%,var(--surface))] border-warning/40",
  },
  danger: {
    icon: CircleAlert,
    role: "alert",
    text: "text-danger",
    box: "bg-[color-mix(in_oklab,var(--danger)_12%,var(--surface))] border-danger/40",
  },
  success: {
    icon: CircleCheck,
    role: "status",
    text: "text-success",
    box: "bg-[color-mix(in_oklab,var(--success)_12%,var(--surface))] border-success/40",
  },
  info: {
    icon: Info,
    role: "status",
    text: "text-info",
    box: "bg-[color-mix(in_oklab,var(--info)_12%,var(--surface))] border-info/40",
  },
} as const;

export interface BannerProps {
  tone?: keyof typeof BANNER_TONES;
  icon?: LucideIcon;
  title?: string;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Banner de estado. Offline tranquiliza; erro diz o que aconteceu e como resolver. */
export function Banner({ tone = "info", icon, title, children, actionLabel, onAction, className }: BannerProps) {
  const t = BANNER_TONES[tone];
  return (
    <div
      role={t.role}
      className={cn(
        "flex min-h-12 items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-sm leading-5 text-fg",
        t.box,
        className,
      )}
    >
      <Icon icon={icon ?? t.icon} size={18} className={t.text} />
      <span className="flex-1">
        {title && <strong>{title}</strong>}
        {title && children ? " – " : null}
        {children}
      </span>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="h-10 cursor-pointer rounded-[10px] bg-transparent px-3 text-sm font-bold text-fg"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  bordered?: boolean;
  className?: string;
}

/** Estado vazio: ícone num tile volt suave (placeholder até a arte definitiva). */
export function EmptyState({ icon = Dumbbell, title, message, actionLabel, onAction, bordered = true, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "grid justify-items-center gap-3 rounded-lg px-5 py-7 text-center",
        bordered && "border border-dashed border-border-strong",
        className,
      )}
    >
      <div className="grid size-[72px] place-items-center rounded-xl bg-[color-mix(in_oklab,var(--accent)_14%,var(--surface-3))] text-accent-text">
        <Icon icon={icon} size={32} />
      </div>
      <strong className="text-[17px]">{title}</strong>
      {message && <span className="max-w-[260px] text-sm leading-5 text-fg-secondary">{message}</span>}
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="h-12 cursor-pointer rounded-md bg-accent px-5 text-[15px] font-bold text-accent-foreground active:bg-accent-pressed"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export interface SkeletonProps {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  radius?: number;
  className?: string;
}

/** Placeholder de carregamento com shimmer (gradiente funcional). */
export function Skeleton({ width = "100%", height = 14, radius = 6, className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block flex-none animate-guf-shimmer bg-[length:200%_100%]",
        "bg-[linear-gradient(90deg,var(--surface-3)_25%,var(--border-strong)_50%,var(--surface-3)_75%)]",
        className,
      )}
      style={{ width, height, borderRadius: radius }}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div aria-busy="true" className={cn("grid gap-2.5 rounded-lg border border-border bg-surface-elevated p-4", className)}>
      <div className="flex items-center gap-3">
        <Skeleton width={44} height={44} radius={12} />
        <div className="grid flex-1 gap-2">
          <Skeleton width="70%" height={14} />
          <Skeleton width="40%" height={10} />
        </div>
      </div>
      <Skeleton height={48} radius={10} />
    </div>
  );
}
