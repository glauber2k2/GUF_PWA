"use client";

import { ChevronRight } from "lucide-react";
import { formatNumber, type StatementMonth } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

interface StatementYearProps {
  year: number;
  months: StatementMonth[];
  onOpenMonth: (season: string) => void;
}

/** Visão do ano: total, barras por mês (tocar abre o mês) e a lista de extratos mensais. */
export function StatementYear({ year, months, onOpenMonth }: StatementYearProps) {
  const available = months.filter((m) => m.isAvailable);
  const yearTotal = available.reduce((sum, m) => sum + m.total, 0);
  const max = Math.max(1, ...available.map((m) => m.total));
  const best = available.reduce<StatementMonth | null>((top, m) => (!top || m.total > top.total ? m : top), null);
  const average = available.length > 0 ? yearTotal / available.length : 0;

  return (
    <>
      <section aria-label="Resumo do ano" className="flex flex-col gap-4 rounded-lg border border-border bg-surface px-4 pt-5 pb-4">
        <div className="flex flex-col gap-0.5 px-1">
          <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Total em {year}</span>
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-[56px] leading-[56px] font-bold tabular-nums">{formatNumber(yearTotal, 0)}</span>
            <span className="text-base text-fg-muted">pts</span>
          </span>
          {best && best.total > 0 && (
            <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">
              Média de {formatNumber(Math.round(average), 0)} pts por mês · melhor mês: {best.name.toLowerCase()}
            </span>
          )}
        </div>
        <div role="group" aria-label="Pontos por mês" className="grid h-[132px] grid-cols-12 items-end gap-1">
          {months.map((m) => (
            <button
              key={m.season}
              type="button"
              disabled={!m.isAvailable}
              onClick={() => onOpenMonth(m.season)}
              aria-label={m.isAvailable ? `${m.name}: ${formatNumber(m.total, 0)} pontos` : `${m.name}: sem dados`}
              className="flex h-full cursor-pointer flex-col items-center justify-end gap-1.5 disabled:cursor-default"
            >
              <span
                className={cn(
                  "w-full max-w-5 rounded-t-[6px] rounded-b-[2px] transition-[height] duration-500 ease-standard",
                  !m.isAvailable ? "border border-dashed border-border-strong" : m.isOpen ? "bg-accent" : "bg-border-strong",
                )}
                style={{ height: m.isAvailable ? `${Math.max(4, (m.total / max) * 100).toFixed(1)}%` : "4%" }}
              />
              <span className={cn("text-[11px] leading-[14px]", m.isOpen ? "font-bold text-accent-text" : "text-fg-muted")}>{m.initial}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Extratos mensais" className="flex flex-col gap-2">
        <span className="px-1 text-[15px] font-semibold">Extratos mensais</span>
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
          {[...available].reverse().map((m) => (
            <button
              key={m.season}
              type="button"
              onClick={() => onOpenMonth(m.season)}
              className="flex cursor-pointer flex-col gap-2 px-3.5 py-3 text-left text-fg transition-colors hover:bg-surface-3"
            >
              <span className="flex w-full items-center gap-2.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] leading-5 font-semibold">{m.name}</span>
                    <span className={cn("inline-flex h-5 items-center rounded-pill px-2 text-[11px] font-bold", m.isOpen ? "bg-accent/16 text-accent-text" : "bg-surface-3 text-fg-secondary")}>
                      {m.isOpen ? "Aberto" : "Fechado"}
                    </span>
                  </span>
                  <span className="text-xs leading-4 text-fg-muted">
                    {m.sessions === 1 ? "1 dia de treino" : `${m.sessions} dias de treino`} · {m.records === 1 ? "1 recorde" : `${m.records} recordes`}
                  </span>
                </span>
                <span className={cn("font-display text-[22px] font-semibold tabular-nums", m.isOpen ? "text-accent-text" : "text-fg")}>{formatNumber(m.total, 0)}</span>
                <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
              </span>
              <span className="block h-1 w-full overflow-hidden rounded-pill bg-surface-3">
                <span className={cn("block h-full rounded-pill", m.isOpen ? "bg-accent" : "bg-border-strong")} style={{ width: `${((m.total / max) * 100).toFixed(1)}%` }} />
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
