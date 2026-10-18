"use client";

import { useState } from "react";
import { BarChart3, CalendarDays, ChevronDown, type LucideIcon } from "lucide-react";
import {
  competitionRange,
  formatShortDate,
  fromLocalISODate,
  isValidCustomRange,
  rangeDays,
  toLocalISODate,
  COMPETITION_DAILY_CHART_MAX_DAYS,
  COMPETITION_MAX_RANGE_DAYS,
  type CompetitionMetric,
  type CompetitionPeriod,
  type CompetitionRange,
} from "@guf/core";
import { BottomSheet, Button, Icon, SheetOption } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { METRICS, METRIC_ORDER, PERIODS, PERIOD_ORDER } from "@/features/competition/constants/competition-labels";

/** "18 out" (sem o dia da semana). */
function shortDay(iso: string): string {
  return formatShortDate(fromLocalISODate(iso)).split(", ")[1] ?? iso;
}

/** Texto do período: "Outubro · faltam 13 dias" · "18 jul – hoje" · "1 ago – 18 out 2026". */
export function periodCaption(period: CompetitionPeriod, range: CompetitionRange, today: Date): string {
  if (period === "month") {
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const left = end.getDate() - today.getDate();
    const month = today.toLocaleDateString("pt-BR", { month: "long" });
    const name = month.charAt(0).toUpperCase() + month.slice(1);
    return left === 0 ? `${name} · último dia` : `${name} · faltam ${left} ${left === 1 ? "dia" : "dias"}`;
  }
  if (period === "custom") return `${shortDay(range.from)} – ${shortDay(range.to)} ${range.to.slice(0, 4)}`;
  return `${shortDay(range.from)} – hoje`;
}

function FilterButton({ icon, caption, value, onClick, ariaLabel }: { icon: LucideIcon; caption: string; value: string; onClick: () => void; ariaLabel: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-14 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-surface-3 px-3 text-left text-fg transition-transform duration-100 ease-standard hover:bg-surface-elevated active:scale-[0.97]"
    >
      <span className="grid size-8 flex-none place-items-center rounded-[8px] bg-accent/16 text-accent-text">
        <Icon icon={icon} size={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[11px] leading-[14px] font-semibold tracking-[0.08em] text-fg-muted uppercase">{caption}</span>
        <span className="truncate text-[15px] leading-5 font-semibold">{value}</span>
      </span>
      <Icon icon={ChevronDown} size={18} className="text-fg-muted" />
    </button>
  );
}

/** Período e métrica de comparação, com as folhas de escolha e o período personalizado. */
export function CompetitionFilters({
  period,
  metric,
  custom,
  today,
  onPeriod,
  onMetric,
}: {
  period: CompetitionPeriod;
  metric: CompetitionMetric;
  custom: CompetitionRange;
  today: Date;
  onPeriod: (period: CompetitionPeriod, custom?: CompetitionRange) => void;
  onMetric: (metric: CompetitionMetric) => void;
}) {
  const [sheet, setSheet] = useState<"period" | "metric" | "custom" | null>(null);
  const [draft, setDraft] = useState<CompetitionRange>(custom);
  const close = () => setSheet(null);
  const draftValid = isValidCustomRange(draft, today);
  const draftDays = draft.from && draft.to ? rangeDays(draft) : 0;
  const draftHint = !draftValid
    ? draft.to > toLocalISODate(today)
      ? "A data final não pode ser depois de hoje."
      : draftDays > COMPETITION_MAX_RANGE_DAYS
        ? `Escolha no máximo ${COMPETITION_MAX_RANGE_DAYS} dias.`
        : "A data final precisa ser depois da inicial."
    : `${draftDays} dias · ${draftDays <= COMPETITION_DAILY_CHART_MAX_DAYS ? "gráfico por dia" : "gráfico por semana"}`;

  return (
    <>
      <div role="group" aria-label="Filtros" className="flex gap-2">
        <FilterButton
          icon={CalendarDays}
          caption="Período"
          value={PERIODS[period].short}
          ariaLabel={`Período: ${PERIODS[period].short}. Alterar`}
          onClick={() => setSheet("period")}
        />
        <FilterButton
          icon={BarChart3}
          caption="Comparar"
          value={METRICS[metric].label}
          ariaLabel={`Comparar por ${METRICS[metric].label}. Alterar`}
          onClick={() => setSheet("metric")}
        />
      </div>

      <BottomSheet placement="screen" open={sheet === "period"} onClose={close} title="Período">
        {PERIOD_ORDER.map((p) => {
          const range = p === "custom" ? custom : competitionRange(p, today);
          return (
            <SheetOption
              key={p}
              icon={PERIODS[p].icon}
              title={PERIODS[p].title}
              subtitle={p === "custom" && period !== "custom" ? "Escolha as datas" : periodCaption(p, range, today)}
              highlighted={period === p}
              onClick={() => {
                if (p === "custom") {
                  setDraft(custom);
                  return setSheet("custom");
                }
                onPeriod(p);
                close();
              }}
            />
          );
        })}
      </BottomSheet>

      <BottomSheet placement="screen" open={sheet === "metric"} onClose={close} title="Comparar por">
        {METRIC_ORDER.map((m) => (
          <SheetOption
            key={m}
            icon={METRICS[m].icon}
            title={METRICS[m].label}
            subtitle={METRICS[m].subtitle}
            highlighted={metric === m}
            onClick={() => {
              onMetric(m);
              close();
            }}
          />
        ))}
      </BottomSheet>

      <BottomSheet placement="screen" open={sheet === "custom"} onClose={close} title="Período personalizado">
        <div className="grid grid-cols-2 gap-2.5">
          {(["from", "to"] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1.5 text-[13px] font-medium text-fg-secondary">
              {key === "from" ? "De" : "Até"}
              <input
                type="date"
                value={draft[key]}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                className="h-12 w-full rounded-md border border-border-strong bg-surface-3 px-3 text-[15px] text-fg"
              />
            </label>
          ))}
        </div>
        <span className={cn("text-[13px] leading-[18px]", draftValid ? "text-fg-muted" : "text-danger")}>{draftHint}</span>
        <Button
          size="tall"
          fullWidth
          disabled={!draftValid}
          onClick={() => {
            onPeriod("custom", draft);
            close();
          }}
        >
          Aplicar período
        </Button>
      </BottomSheet>
    </>
  );
}
