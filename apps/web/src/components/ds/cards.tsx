import { ArrowUpRight, GripVertical, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./brand";

const CARD = "rounded-lg border border-border bg-surface-elevated";

export interface RoutineCardProps {
  eyebrow?: string;
  title: string;
  exercises?: string;
  meta?: string[];
  ctaLabel?: string;
  onStart?: () => void;
  draggable?: boolean;
  className?: string;
}

/** Card de rotina: próxima rotina sugerida com CTA volt. */
export function RoutineCard({
  eyebrow = "Próxima",
  title,
  exercises,
  meta = [],
  ctaLabel = "Iniciar rotina",
  onStart,
  draggable = true,
  className,
}: RoutineCardProps) {
  return (
    <div className={cn(CARD, "grid gap-3 p-4 shadow-e1", className)}>
      <div className="flex justify-between gap-2">
        <div className="grid gap-1">
          {eyebrow && (
            <span className="text-[11px] font-semibold tracking-[0.08em] text-accent-text uppercase">{eyebrow}</span>
          )}
          <strong className="text-[17px]">{title}</strong>
        </div>
        {draggable && <Icon icon={GripVertical} size={18} className="text-fg-muted" />}
      </div>
      {exercises && <span className="text-sm leading-5 text-fg-secondary">{exercises}</span>}
      {meta.length > 0 && (
        <div className="flex flex-wrap gap-4 text-[13px] text-fg-muted">
          {meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      )}
      {ctaLabel && (
        <button
          type="button"
          onClick={onStart}
          className={cn(
            "h-12 cursor-pointer rounded-md bg-accent text-[15px] font-bold text-accent-foreground",
            "transition-transform duration-100 active:scale-[.97] active:bg-accent-pressed motion-reduce:active:scale-100",
          )}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

export interface ProjectCardProps {
  title: string;
  /** Letras das rotinas (A, B, C…). */
  routines?: string[];
  meta?: string;
  status?: "active" | "inactive" | "archived";
  onClick?: () => void;
  className?: string;
}

/** Card de projeto. Ativo: borda 1,5px accent-text + selo "Ativo". */
export function ProjectCard({ title, routines = [], meta, status = "active", onClick, className }: ProjectCardProps) {
  const interactive = onClick ? "cursor-pointer" : undefined;
  if (status === "archived") {
    return (
      <div
        onClick={onClick}
        className={cn(
          CARD,
          "flex items-center justify-between px-4 py-3.5 text-sm text-fg-secondary",
          interactive,
          className,
        )}
      >
        <span>{title}</span>
        <span className="text-xs text-fg-muted">Arquivado</span>
      </div>
    );
  }
  const active = status === "active";
  return (
    <div
      onClick={onClick}
      className={cn(
        "grid gap-3 rounded-lg bg-surface-elevated p-4",
        active ? "border-[1.5px] border-accent-text" : "border border-border",
        interactive,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <strong className="text-[17px]">{title}</strong>
        {active && (
          <span className="flex h-6 items-center rounded-pill bg-accent px-2.5 text-xs font-bold text-accent-foreground">
            Ativo
          </span>
        )}
      </div>
      {routines.length > 0 && (
        <div className="flex gap-1.5">
          {routines.map((r) => (
            <span
              key={r}
              className="grid h-9 flex-1 place-items-center rounded-sm bg-surface-3 font-display text-lg font-bold"
            >
              {r}
            </span>
          ))}
        </div>
      )}
      {meta && <span className="text-[13px] text-fg-muted">{meta}</span>}
    </div>
  );
}

export interface SummaryStat {
  value: string;
  label: string;
}

export interface WorkoutSummaryCardProps {
  title: string;
  date?: string;
  stats?: SummaryStat[];
  prs?: number;
  delta?: string;
  deltaLabel?: string;
  onClick?: () => void;
  className?: string;
}

/** Resumo de treino concluído: estatísticas em Barlow + PRs + variação. */
export function WorkoutSummaryCard({
  title,
  date,
  stats = [],
  prs = 0,
  delta,
  deltaLabel = "vs. treino anterior",
  onClick,
  className,
}: WorkoutSummaryCardProps) {
  return (
    <div onClick={onClick} className={cn(CARD, "grid gap-3.5 p-4 shadow-e1", onClick && "cursor-pointer", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <strong className="text-base">{title}</strong>
        {date && <span className="text-[13px] whitespace-nowrap text-fg-muted">{date}</span>}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, stats.length)}, 1fr)` }}>
        {stats.map((s) => (
          <div key={s.label} className="grid gap-0.5">
            <span className="font-display text-[28px] font-semibold tabular-nums">{s.value}</span>
            <span className="text-xs text-fg-muted">{s.label}</span>
          </div>
        ))}
      </div>
      {(prs > 0 || delta) && (
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-fg-secondary">
          {prs > 0 && (
            <span className="flex h-6 items-center gap-1 rounded-pill bg-pr px-2 text-xs font-bold text-pr-foreground">
              <Icon icon={Trophy} size={12} />
              {prs} {prs === 1 ? "PR" : "PRs"}
            </span>
          )}
          {delta && (
            <>
              <span className="flex items-center gap-0.5 text-success">
                <Icon icon={ArrowUpRight} size={14} />
                {delta}
              </span>
              {deltaLabel}
            </>
          )}
        </div>
      )}
    </div>
  );
}
