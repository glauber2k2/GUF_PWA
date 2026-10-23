"use client";

import { ChevronDown, CircleSlash } from "lucide-react";
import {
  daysForSource,
  pointsDeltaLabel,
  sessionOutcomeLine,
  sessionRecordsLine,
  weekSourceLine,
  type PointSource,
  type StatementDay,
  type StatementRule,
  type StatementWeekView,
} from "@guf/core";
import { Collapse, Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { POINT_SOURCE_STYLES, PointSourceIcon } from "@/features/competition/constants/point-sources";

interface StatementLineProps {
  source: PointSource | null;
  title: string;
  detail: string;
  points: number;
  dimmed: boolean;
}

/** Uma origem de pontos dentro do treino ou da semana ("Recordes · 2 recordes · +10"). */
function StatementLine({ source, title, detail, points, dimmed }: StatementLineProps) {
  return (
    <div className={cn("flex min-h-11 items-center gap-2.5 transition-opacity duration-200", dimmed && "opacity-40")}>
      <span className={cn("grid size-7 flex-none place-items-center rounded-[8px]", source ? cn(POINT_SOURCE_STYLES[source].tint, POINT_SOURCE_STYLES[source].text) : "bg-surface-3 text-fg-muted")}>
        {source ? <PointSourceIcon source={source} size={15} /> : <Icon icon={CircleSlash} size={15} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[13px] leading-[18px] font-semibold">{title}</span>
        <span className="text-xs leading-4 text-fg-muted tabular-nums">{detail}</span>
      </span>
      <span className={cn("font-display text-lg font-semibold tabular-nums", points > 0 ? "text-fg" : "text-fg-muted")}>{pointsDeltaLabel(points)}</span>
    </div>
  );
}

interface StatementDayRowProps {
  day: StatementDay;
  rule: StatementRule;
  filter: PointSource | null;
  open: boolean;
  onToggle: () => void;
}

/** Treino da semana: dia, nome, chips das origens e, aberto, cada linha de pontos. */
function StatementDayRow({ day, rule, filter, open, onToggle }: StatementDayRowProps) {
  const outcome = sessionOutcomeLine(day, rule.minMinutes);
  const dim = (source: PointSource) => Boolean(filter && filter !== source);
  const total = filter === "constancy" ? day.constancy : filter === "records" ? day.recordPoints : day.total;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-[68px] w-full cursor-pointer items-center gap-3 py-2.5 pr-3.5 pl-3 text-left text-fg transition-colors hover:bg-surface-3"
      >
        <span className="flex w-9 flex-none flex-col items-center">
          <span className="font-display text-[22px] leading-6 font-bold tabular-nums">{day.dayLabel}</span>
          <span className="text-[11px] leading-[14px] text-fg-muted">{day.weekdayLabel}</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-[15px] leading-5 font-semibold">{day.name}</span>
          <span className="flex flex-wrap gap-1">
            {day.constancy > 0 && <SourceChip source="constancy" points={day.constancy} dimmed={dim("constancy")} />}
            {day.recordPoints > 0 && <SourceChip source="records" points={day.recordPoints} dimmed={dim("records")} />}
            {day.outcome !== "counted" && <span className="inline-flex h-5 items-center rounded-[6px] bg-surface-3 px-1.5 text-[11px] font-bold text-fg-muted">Não contou</span>}
          </span>
        </span>
        <span className={cn("font-display text-2xl leading-6 font-semibold tabular-nums", total > 0 ? "text-accent-text" : "text-fg-muted")}>{pointsDeltaLabel(total)}</span>
        <Icon icon={ChevronDown} size={18} className={cn("text-fg-muted transition-transform duration-200", open && "rotate-180")} />
      </button>
      <Collapse open={open}>
        <div className="mr-3 mb-3 ml-[60px] flex flex-col gap-0.5 border-t border-dashed border-border pt-1">
          <StatementLine source={day.constancy > 0 ? "constancy" : null} title={outcome.title} detail={outcome.detail} points={day.constancy} dimmed={dim("constancy")} />
          {day.recordCount > 0 && <StatementLine source="records" {...sessionRecordsLine(day, rule.recordPoints)} points={day.recordPoints} dimmed={dim("records")} />}
        </div>
      </Collapse>
    </div>
  );
}

function SourceChip({ source, points, dimmed }: { source: PointSource; points: number; dimmed: boolean }) {
  const style = POINT_SOURCE_STYLES[source];
  return (
    <span className={cn("inline-flex h-5 items-center gap-[3px] rounded-[6px] px-1.5 text-[11px] font-bold tabular-nums transition-opacity", style.tint, style.text, dimmed && "opacity-40")}>
      <PointSourceIcon source={source} size={12} />
      {pointsDeltaLabel(points)}
    </span>
  );
}

interface StatementWeekCardProps {
  week: StatementWeekView;
  rule: StatementRule;
  filter: PointSource | null;
  /** O primeiro treino do extrato abre sozinho. */
  isFirstWeek: boolean;
  isOpen: (sessionId: string, isFirst: boolean) => boolean;
  onToggle: (sessionId: string, isFirst: boolean) => void;
}

/** Semana do extrato: total, os treinos (com o que cada um rendeu) e as linhas da semana (sequência, volume). */
export function StatementWeekCard({ week, rule, filter, isFirstWeek, isOpen, onToggle }: StatementWeekCardProps) {
  const days = daysForSource(week, filter);
  const weekSources = (["streak", "volume"] as const).filter((s) => week.parts[s] > 0 && (!filter || filter === s));
  const total = filter ? week.parts[filter] : week.total;
  if (days.length === 0 && weekSources.length === 0) return null;

  return (
    <section aria-label={week.label} className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between px-1">
        <span className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold">{week.label}</span>
          {week.relative && <span className="text-xs text-fg-muted">{week.relative}</span>}
        </span>
        <span className="text-[13px] font-semibold text-fg-secondary tabular-nums">{pointsDeltaLabel(total).replace("+", "")} pts</span>
      </div>
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {days.map((day, i) => {
          const isFirst = isFirstWeek && i === 0;
          return <StatementDayRow key={day.sessionId} day={day} rule={rule} filter={filter} open={isOpen(day.sessionId, isFirst)} onToggle={() => onToggle(day.sessionId, isFirst)} />;
        })}
        {weekSources.length > 0 && (
          <div className="flex flex-col gap-0.5 px-3 py-1.5">
            {weekSources.map((source) => (
              <StatementLine key={source} source={source} {...weekSourceLine(week, source)} points={week.parts[source]} dimmed={false} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
