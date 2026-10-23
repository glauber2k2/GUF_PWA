"use client";

import { Check, X } from "lucide-react";
import { formatNumber, pointsDeltaLabel, POINT_SOURCE_LABELS, POINT_SOURCES, type PointSource } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { useCountUp } from "@/shared/hooks/use-count-up";
import { cn } from "@/shared/helpers/class-names";
import { POINT_SOURCE_STYLES, PointSourceIcon } from "@/features/competition/constants/point-sources";

interface StatementSummaryProps {
  title: string;
  /** "12 treinos que contaram" */
  caption: string;
  totals: Record<PointSource, number> & { total: number };
  filter: PointSource | null;
  onToggleFilter: (source: PointSource) => void;
  onClearFilter: () => void;
}

/** Total do período (conta até o valor), barra por origem e os filtros (tocar mostra só aquela origem). */
export function StatementSummary({ title, caption, totals, filter, onToggleFilter, onClearFilter }: StatementSummaryProps) {
  const count = useCountUp(totals.total, { delayMs: 120 });
  const partsTotal = Math.max(1, POINT_SOURCES.reduce((sum, s) => sum + totals[s], 0));
  const barAria = POINT_SOURCES.map((s) => `${POINT_SOURCE_LABELS[s]} ${pointsDeltaLabel(totals[s]).replace("+", "")} pontos`).join(", ");

  return (
    <section aria-label="Resumo" className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-0.5 pt-2 pb-1">
        <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">{title}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[72px] leading-[72px] font-bold tracking-[-0.01em] tabular-nums">{formatNumber(count, 0)}</span>
          <span className="text-base text-fg-muted">pts</span>
        </span>
        <span className="text-[13px] leading-[18px] text-fg-secondary">{caption}</span>
      </div>

      <div role="img" aria-label={barAria} className="flex h-2.5 gap-[3px]">
        {POINT_SOURCES.map((source) => (
          <span
            key={source}
            className={cn(
              "h-full rounded-pill transition-[width,opacity] duration-500 ease-standard motion-reduce:transition-none",
              POINT_SOURCE_STYLES[source].bar,
              filter && filter !== source && "opacity-40",
            )}
            style={{ width: `${((totals[source] / partsTotal) * 100).toFixed(1)}%` }}
          />
        ))}
      </div>

      <div role="group" aria-label="Filtrar por origem" className="grid grid-cols-2 gap-2">
        {POINT_SOURCES.map((source) => {
          const on = filter === source;
          const style = POINT_SOURCE_STYLES[source];
          return (
            <button
              key={source}
              type="button"
              aria-pressed={on}
              onClick={() => onToggleFilter(source)}
              className={cn(
                "flex cursor-pointer flex-col items-start gap-1.5 rounded-lg border p-3 text-left text-fg transition-[background-color,border-color,opacity,transform] duration-200 ease-standard active:scale-[.96]",
                on ? cn("border-[1.5px] bg-surface-elevated", style.ring) : "border-border bg-surface",
                filter && !on && "opacity-50",
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span className={cn("grid size-7 place-items-center rounded-[8px]", style.tint, style.text)}>
                  <PointSourceIcon source={source} />
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-[18px] place-items-center rounded-pill text-accent-foreground transition-[opacity,transform] duration-200",
                    style.bar,
                    on ? "scale-100 opacity-100" : "scale-40 opacity-0",
                  )}
                >
                  <Icon icon={Check} size={12} />
                </span>
              </span>
              <span className="font-display text-[28px] leading-7 font-semibold tabular-nums">{pointsDeltaLabel(totals[source]).replace("+", "")}</span>
              <span className="text-[13px] leading-[18px] font-semibold">{POINT_SOURCE_LABELS[source]}</span>
            </button>
          );
        })}
      </div>

      <div className="flex min-h-8 items-center justify-between gap-2 text-[13px] leading-[18px] text-fg-muted">
        <span>{filter ? `Mostrando só ${POINT_SOURCE_LABELS[filter].toLowerCase()}` : "Toque numa origem para filtrar"}</span>
        {filter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="flex h-8 cursor-pointer items-center gap-1 rounded-pill border border-border-strong px-3 text-[13px] font-semibold text-fg active:scale-[.96]"
          >
            <Icon icon={X} size={14} />
            Limpar
          </button>
        )}
      </div>
    </section>
  );
}
