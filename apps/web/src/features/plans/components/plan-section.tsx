import type { ReactNode } from "react";
import { cn } from "@/shared/helpers/class-names";

export interface PlanSectionProps {
  id: string;
  title: string;
  children: ReactNode;
  className?: string;
}

/** Bloco da tela de planos com o título pequeno em caixa alta ("Free e Pro lado a lado"). */
export function PlanSection({ id, title, children, className }: PlanSectionProps) {
  return (
    <section aria-labelledby={id} className={cn("flex flex-col gap-2.5", className)}>
      <h2 id={id} className="m-0 px-1 text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
