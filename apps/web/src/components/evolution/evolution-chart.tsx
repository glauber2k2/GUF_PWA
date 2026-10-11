"use client";

import { useState } from "react";
import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLine, Minus, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import {
  addLocalDays,
  EVOLUTION_METRICS,
  EVOLUTION_PERIODS,
  evolutionChartSummary,
  evolutionDeltaLabel,
  formatDayMonth,
  formatNumber,
  fromLocalISODate,
  TIMES_SIGN,
  toDisplayWeight,
  type EvolutionMetric,
  type EvolutionPeriod,
  type EvolutionPoint,
  type EvolutionSeries,
  type ExerciseSessionEvolution,
  type WeightUnit,
} from "@guf/core";
import { Banner, Icon, SegmentedControl } from "@/components/ds";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const METRIC_OPTIONS = EVOLUTION_METRICS.map((m) => ({ value: m.value, label: m.label }));
const PERIOD_OPTIONS = EVOLUTION_PERIODS.map((p) => ({ value: p.value, label: p.label }));
const CHART_HEIGHT = 196;

export interface EvolutionChartProps {
  series: EvolutionSeries;
  last: ExerciseSessionEvolution;
  metric: EvolutionMetric;
  period: EvolutionPeriod;
  unit: WeightUnit;
  /** Só 1 treino em todo o histórico. */
  single: boolean;
  onMetricChange: (metric: EvolutionMetric) => void;
  onPeriodChange: (period: EvolutionPeriod) => void;
}

/** Card "Evolução": métrica, último treino, variação no período, gráfico (um ponto por treino) e legenda. */
export function EvolutionChart({ series, last, metric, period, unit, single, onMetricChange, onPeriodChange }: EvolutionChartProps) {
  const digits = metric === "volume" ? 0 : 1;
  const lastValue = toDisplayWeight(metric === "carga" ? last.maxWeightKg : metric === "1rm" ? last.best1RMKg : last.volumeKg, unit);
  const bigUnit = metric === "carga" && last.repsAtMax ? `${unit} ${TIMES_SIGN} ${last.repsAtMax}` : unit;
  const footnote = EVOLUTION_METRICS.find((m) => m.value === metric)?.footnote;

  return (
    <section aria-labelledby="evolution-chart-title" className="flex flex-none animate-guf-rise flex-col gap-3.5 rounded-lg border border-border bg-surface px-4 pt-5 pb-4 shadow-e1 [animation-delay:60ms]">
      <h2 id="evolution-chart-title" className="m-0 ml-1 text-lg leading-6 font-semibold tracking-[-0.015em]">
        Evolução
      </h2>
      <SegmentedControl label="Métrica do gráfico" options={METRIC_OPTIONS} value={metric} onChange={(v) => onMetricChange(v as EvolutionMetric)} />

      <div className="flex flex-col gap-0.5 px-1">
        <span className="text-xs leading-4 text-fg-muted tabular-nums">Último treino · {formatDayMonth(fromLocalISODate(last.performedOn))}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-num-lg font-semibold tabular-nums">{lastValue === null ? "—" : formatNumber(lastValue, digits)}</span>
          <span className="text-[15px] text-fg-muted tabular-nums">{bigUnit}</span>
        </div>
        {!single && <DeltaLabel series={series} metric={metric} period={period} unit={unit} />}
      </div>

      {single && (
        <Banner tone="info" icon={ChartLine}>
          Faça mais treinos para ver a evolução
        </Banner>
      )}

      {series.points.length === 0 ? (
        <div className="grid h-[180px] place-items-center rounded-md border border-dashed border-border-strong px-6 text-center text-sm leading-5 text-fg-secondary">
          Nenhum treino com este exercício neste período.
        </div>
      ) : (
        <PointsChart key={`${metric}-${period}`} series={series} metric={metric} period={period} unit={unit} />
      )}

      <SegmentedControl variant="solid" label="Período do gráfico" options={PERIOD_OPTIONS} value={period} onChange={(v) => onPeriodChange(v as EvolutionPeriod)} />

      <div aria-hidden="true" className="flex flex-wrap items-center gap-3.5 px-1 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-pill bg-data" />
          Treino
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-pill bg-pr" />
          <Icon icon={Trophy} size={12} className="text-pr-text" />
          Recorde pessoal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 border-t-2 border-dashed border-fg-secondary" />
          Tendência
        </span>
      </div>
      <span className="border-t border-border px-1 pt-2.5 text-xs leading-4 text-pretty text-fg-muted">{footnote}</span>
    </section>
  );
}

/** Variação no período: alta em volt; queda e "sem variação" em cor neutra (queda não é erro). */
function DeltaLabel({ series, metric, period, unit }: { series: EvolutionSeries; metric: EvolutionMetric; period: EvolutionPeriod; unit: WeightUnit }) {
  const delta = series.delta;
  const up = delta !== null && delta > 0;
  const icon = delta === null || delta === 0 ? Minus : up ? TrendingUp : TrendingDown;
  const text =
    delta === null
      ? `${series.points.length === 1 ? "1 treino" : `${series.points.length} treinos`} no período`
      : evolutionDeltaLabel(delta, metric, unit, period, series.start);
  return (
    <span className={cn("flex items-center gap-1 text-sm font-semibold tabular-nums", up ? "text-accent-text" : "text-fg-secondary")}>
      <Icon icon={icon} size={16} />
      {text}
    </span>
  );
}

interface ChartDatum extends EvolutionPoint {
  /** Área preenchida sob a linha (mesmo valor). */
  area: number;
}

function PointsChart({ series, metric, period, unit }: { series: EvolutionSeries; metric: EvolutionMetric; period: EvolutionPeriod; unit: WeightUnit }) {
  const [animate] = useState(() => !prefersReducedMotion());
  const data: ChartDatum[] = series.points.map((p) => ({ ...p, area: p.value }));
  const values = data.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.18 || max * 0.08 || 1;
  const lo = Math.max(0, Math.floor(min - pad));
  const hi = Math.ceil(max + pad);
  const digits = metric === "volume" ? 0 : 1;
  const start = fromLocalISODate(series.start);
  const dayLabel = (day: number) => {
    const date = addLocalDays(start, Math.round(day));
    return period === "3m" || period === "6m" ? formatDayMonth(date) : `${formatDayMonth(date).split(" ")[1]}/${String(date.getFullYear()).slice(2)}`;
  };

  return (
    <figure role="group" aria-label={evolutionChartSummary(series, metric, period, unit)} className="m-0 h-[196px] w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={data} margin={{ top: 12, right: 0, bottom: 0, left: 8 }}>
          <XAxis
            type="number"
            dataKey="day"
            domain={[0, series.spanDays]}
            ticks={[0, series.spanDays / 2, series.spanDays]}
            tickFormatter={dayLabel}
            tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border-strong)" }}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            domain={[lo, hi]}
            ticks={[lo, (lo + hi) / 2, hi]}
            tickFormatter={(v: number) => formatNumber(v, 0)}
            tick={{ fill: "var(--color-fg-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: "var(--color-fg-muted)", strokeWidth: 1 }}
            content={({ active, payload }) => <PointTooltip active={active} point={payload?.[0]?.payload as ChartDatum | undefined} metric={metric} unit={unit} digits={digits} />}
          />
          <Area dataKey="area" type="linear" stroke="none" fill="var(--color-data)" fillOpacity={0.14} isAnimationActive={animate} animationDuration={600} />
          <Line
            dataKey="value"
            type="linear"
            stroke="var(--color-data)"
            strokeWidth={2.5}
            dot={(props) => <PointDot key={(props.payload as ChartDatum).sessionId} cx={props.cx} cy={props.cy} payload={props.payload as ChartDatum} />}
            activeDot={(props) => <PointDot cx={props.cx} cy={props.cy} payload={props.payload as ChartDatum} active />}
            isAnimationActive={animate}
            animationDuration={600}
          />
          <Line
            dataKey="trend"
            type="linear"
            stroke="var(--color-fg-secondary)"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationBegin={300}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  );
}

/** Ponto do treino: volt-dados; recorde em dourado e maior; selecionado com anel. */
function PointDot({ cx, cy, payload, active = false }: { cx?: number; cy?: number; payload?: ChartDatum; active?: boolean }) {
  if (cx === undefined || cy === undefined) return null;
  const record = payload?.isRecord ?? false;
  const r = active ? 7 : record ? 6 : 4;
  const color = record ? "var(--color-pr)" : "var(--color-data)";
  return (
    <g>
      {active && <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={color} strokeWidth={2} />}
      <circle cx={cx} cy={cy} r={r} fill={color} stroke="var(--color-surface)" strokeWidth={2} />
    </g>
  );
}

function PointTooltip({ active, point, metric, unit, digits }: { active?: boolean; point: ChartDatum | undefined; metric: EvolutionMetric; unit: WeightUnit; digits: number }) {
  if (!active || !point) return null;
  const s = point.session;
  const date = formatDayMonth(fromLocalISODate(point.performedOn));
  const loadText = (kg: number, reps: number | null) => `${formatNumber(toDisplayWeight(kg, unit) ?? 0)} ${unit}${reps ? ` ${TIMES_SIGN} ${reps}` : ""}`;
  const main =
    metric === "carga" ? `${date} · ${loadText(s.maxWeightKg, s.repsAtMax)}` : `${date} · ${formatNumber(point.value, digits)} ${unit}`;
  const sub =
    metric === "1rm" && s.best1RMSet
      ? `1RM est. com ${loadText(s.best1RMSet.weightKg, s.best1RMSet.reps)}`
      : metric === "volume"
        ? `${s.setCount === 1 ? "1 série" : `${s.setCount} séries`}`
        : null;
  return (
    <div className="flex animate-guf-fade flex-col gap-0.5 rounded-[10px] border border-border-strong bg-surface-3 px-2.5 py-2 whitespace-nowrap shadow-e2">
      <span className="text-[13px] leading-[18px] font-semibold tabular-nums">{main}</span>
      {sub && <span className="text-xs leading-4 text-fg-secondary tabular-nums">{sub}</span>}
      {point.isRecord && (
        <span className="flex items-center gap-1 text-xs leading-4 font-semibold text-pr-text">
          <Icon icon={Trophy} size={12} />
          Recorde pessoal
        </span>
      )}
    </div>
  );
}
