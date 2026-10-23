"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { seasonStatusHint, statementMonthTitle } from "@guf/core";
import { IconButton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

interface StatementMonthNavProps {
  season: Date;
  today: Date;
  isCurrent: boolean;
  canGoBack: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

/** Mês do extrato (temporada) com a situação: aberto até o último dia, depois fechado. */
export function StatementMonthNav({ season, today, isCurrent, canGoBack, onPrevious, onNext }: StatementMonthNavProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-1.5">
      <IconButton icon={ChevronLeft} label="Mês anterior" onClick={onPrevious} disabled={!canGoBack} className={cn(!canGoBack && "opacity-35")} />
      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
        <span className="flex items-center gap-2">
          <span className="text-base leading-[22px] font-semibold">{statementMonthTitle(season)}</span>
          <span
            className={cn(
              "inline-flex h-5 items-center rounded-pill px-2 text-[11px] font-bold",
              isCurrent ? "bg-accent/16 text-accent-text" : "bg-surface-3 text-fg-secondary",
            )}
          >
            {isCurrent ? "Aberto" : "Fechado"}
          </span>
        </span>
        <span className="text-xs leading-4 text-fg-muted">{seasonStatusHint(season, today)}</span>
      </div>
      <IconButton icon={ChevronRight} label="Próximo mês" onClick={onNext} disabled={isCurrent} className={cn(isCurrent && "opacity-35")} />
    </div>
  );
}
