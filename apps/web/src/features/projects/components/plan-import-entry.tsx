"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Icon } from "@/shared/components/ds";
import { AiMark } from "@/shared/components/ai-mark";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { cn } from "@/shared/helpers/class-names";
import { PLAN_IMPORT_PATH } from "@/features/projects/helpers/paths";

/** Atalho da lista de Projetos para importar a ficha do personal com o GUF AI (só online). */
export function PlanImportEntry({ disabled }: { disabled: boolean }) {
  const content = (
    <>
      <span className="grid size-10 flex-none place-items-center rounded-md bg-accent/16 text-accent-text">
        <AiMark size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] leading-5 font-semibold text-fg">Importar ficha com o GUF AI</span>
        <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">Cole a ficha do personal e o GUF AI monta as rotinas.</span>
      </span>
      <Icon icon={ChevronRight} size={18} className="flex-none text-fg-muted" />
    </>
  );
  const className = "flex min-h-[64px] items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-left no-underline shadow-e1";

  if (disabled) {
    return (
      <div aria-disabled="true" className={cn(className, "opacity-50")}>
        {content}
      </div>
    );
  }
  return (
    <Link href={withDevState(PLAN_IMPORT_PATH)} className={cn(className, "transition-colors hover:bg-surface-3")}>
      {content}
    </Link>
  );
}
