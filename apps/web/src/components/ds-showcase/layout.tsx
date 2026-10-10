import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* Peças de layout da vitrine do design system (só desenvolvimento). */

export const PANEL = "rounded-lg border border-border bg-surface";
export const OVERLINE = "text-[11px] font-semibold tracking-[0.08em] uppercase";

export function SectionHeader({ index, title, children, action }: { index: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        <span className={cn(OVERLINE, "text-accent-text")}>{index}</span>
        <h2 className="m-0 text-[22px] leading-7 font-semibold tracking-[-0.015em]">{title}</h2>
        {children && <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">{children}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ id, children, gap = "gap-6" }: { id?: string; children: ReactNode; gap?: string }) {
  return (
    <section id={id} className={cn("grid scroll-mt-16", gap)}>
      {children}
    </section>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-3.5">
      <h3 className="m-0 text-lg leading-6 font-semibold">{title}</h3>
      {children}
    </div>
  );
}
