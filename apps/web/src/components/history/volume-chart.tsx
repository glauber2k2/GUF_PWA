"use client";

import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartColumn, Minus, TrendingDown, TrendingUp } from "lucide-react";
import {
  CHART_PERIOD_LABELS,
  CHART_PERIOD_WEEKS,
  chartAxisMax,
  formatDayMonth,
  formatNumber,
  fromLocalISODate,
  periodAverage,
  periodComparison,
  plural,
  toDisplayWeight,
  trendLine,
  weeklyAverageVolume,
  type ChartPeriod,
  type TrainingDayLike,
  type WeightUnit,
} from "@guf/core";
import { Banner, Icon, SegmentedControl } from "@/components/ds";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS = (Object.keys(CHART_PERIOD_WEEKS) as ChartPeriod[]).map((value) => ({ value, label: CHART_PERIOD_LABELS[value].short }));
const CHART_HEIGHT = 196;
/** Passo do eixo Y por unidade (números redondos). */
const AXIS_STEP: Record<WeightUnit, number> = { kg: 2000, lb: 5000 };

interface ChartPoint {
  weekStart: string;
  sessions: number;
  /** Média da semana na unidade do usuário; null = semana sem treino (lacuna). */
  value: number | null;
  trend: number | null;
}

export interface VolumeChartProps {
  days: readonly TrainingDayLike[];
  today: Date;
  unit: WeightUnit;
  period: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
  /** Menos de 2 semanas com treino em todo o histórico. */
  fewData: boolean;
}

/** "Volume médio por dia treinado": barras por semana + linha de tendência, com comparação ao período anterior. */
export function VolumeChart({ days, today, unit, period, onPeriodChange, fewData }: VolumeChartProps) {
  const weeks = CHART_PERIOD_WEEKS[period];
  const data = useMemo(() => buildSeries(days, today, weeks, unit), [days, today, weeks, unit]);
  const hasData = days.length > 0;

  return (
    <section aria-label="Volume médio por dia treinado" className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface px-4 pt-5 pb-4 shadow-e1">
      <h2 className="m-0 ml-1 text-lg leading-6 font-semibold tracking-[-0.015em]">Volume médio por dia treinado</h2>
      <SegmentedControl
        label="Período do gráfico"
        options={PERIOD_OPTIONS}
        value={period}
        onChange={(v) => onPeriodChange(v as ChartPeriod)}
      />

      {hasData ? (
        <>
          <ChartHeader average={data.average} delta={fewData ? undefined : data.delta} unit={unit} />
          {fewData && (
            <Banner tone="info" icon={ChartColumn}>
              Treine mais algumas semanas para ver sua evolução.
            </Banner>
          )}
          <WeeklyBars key={period} points={data.points} unit={unit} axisMax={data.axisMax} summary={chartSummary(data, period, unit)} />
          <div className="flex flex-wrap items-center gap-3.5 px-1 text-xs text-fg-muted" aria-hidden="true">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px] bg-data" />
              Média da semana
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-[2px] bg-fg" />
              Tendência
            </span>
          </div>
        </>
      ) : (
        <div className="flex h-[200px] flex-col items-center justify-center gap-2.5 rounded-md border border-dashed border-border-strong px-6 text-center">
          <span className="grid size-11 place-items-center rounded-md bg-surface-3 text-fg-secondary">
            <Icon icon={ChartColumn} size={22} />
          </span>
          <span className="text-[15px] font-semibold">Sem dados ainda</span>
          <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">O gráfico aparece depois do primeiro treino concluído.</span>
        </div>
      )}

      <span className="border-t border-border px-1 pt-2.5 text-xs leading-4 text-pretty text-fg-muted">
        Volume = carga × repetições das séries concluídas, sem aquecimento.
      </span>
    </section>
  );
}

/* ---------------------------------------------------------------------
 * Dados
 * --------------------------------------------------------------------- */

interface ChartSeries {
  points: ChartPoint[];
  /** Média do período na unidade do usuário (null = sem treino no período). */
  average: number | null;
  /** Variação % sobre o período anterior (null = sem dados para comparar). */
  delta: number | null;
  axisMax: number;
  peak: ChartPoint | null;
}

function buildSeries(days: readonly TrainingDayLike[], today: Date, weeks: number, unit: WeightUnit): ChartSeries {
  const current = weeklyAverageVolume(days, today, weeks);
  const previous = weeklyAverageVolume(days, today, weeks, weeks);
  const values = current.map((w) => toDisplayWeight(w.averageVolumeKg, unit));
  const trend = trendLine(values);
  const points = current.map((w, i) => ({ weekStart: w.weekStart, sessions: w.sessions, value: values[i] ?? null, trend: trend[i] ?? null }));
  const present = points.filter((p): p is ChartPoint & { value: number } => p.value !== null);
  const peak = present.reduce<ChartPoint | null>((best, p) => (best && (best.value ?? 0) >= p.value ? best : p), null);
  const averageKg = periodAverage(current);
  return {
    points,
    average: toDisplayWeight(averageKg, unit),
    delta: periodComparison(averageKg, periodAverage(previous)),
    axisMax: chartAxisMax(peak?.value ?? 0, AXIS_STEP[unit]),
    peak,
  };
}

/** Resumo em texto do gráfico para leitores de tela. */
function chartSummary(series: ChartSeries, period: ChartPeriod, unit: WeightUnit): string {
  const parts = [`Volume médio por dia treinado, ${CHART_PERIOD_LABELS[period].long}`];
  parts.push(series.average === null ? "sem treinos no período" : `média ${formatNumber(series.average, 0)} ${unit}`);
  if (series.delta !== null) parts.push(`${series.delta >= 0 ? "mais" : "menos"} ${Math.abs(series.delta)}% em relação ao período anterior`);
  if (series.peak?.value != null)
    parts.push(`maior semana: ${formatDayMonth(fromLocalISODate(series.peak.weekStart))}, ${formatNumber(series.peak.value, 0)} ${unit}`);
  return `${parts.join(", ")}. Use as setas para ver cada semana.`;
}

/* ---------------------------------------------------------------------
 * Partes visuais
 * --------------------------------------------------------------------- */

function ChartHeader({ average, delta, unit }: { average: number | null; delta: number | null | undefined; unit: WeightUnit }) {
  return (
    <div className="flex flex-col gap-0.5 px-1">
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-num-lg font-semibold tabular-nums">{average === null ? "—" : formatNumber(average, 0)}</span>
        <span className="text-sm text-fg-muted">{unit} · média do período</span>
      </div>
      {delta !== undefined && <DeltaLabel delta={delta} />}
    </div>
  );
}

/** Variação: alta em volt; queda e "igual" em cor neutra (queda não é erro). */
function DeltaLabel({ delta }: { delta: number | null }) {
  const up = delta !== null && delta > 0;
  const icon = delta === null || delta === 0 ? Minus : up ? TrendingUp : TrendingDown;
  const text =
    delta === null
      ? "Sem dados do período anterior"
      : delta === 0
        ? "Igual ao período anterior"
        : `${up ? "+" : "−"}${Math.abs(delta)}% vs. período anterior`;
  return (
    <span className={cn("flex items-center gap-1 text-sm font-semibold tabular-nums", up ? "text-accent-text" : "text-fg-secondary")}>
      <Icon icon={icon} size={16} />
      {text}
    </span>
  );
}

function WeeklyBars({ points, unit, axisMax, summary }: { points: ChartPoint[]; unit: WeightUnit; axisMax: number; summary: string }) {
  const [animate] = useState(() => !prefersReducedMotion());
  const count = points.length;
  const xTicks = count <= 4 ? points.map((p) => p.weekStart) : [0, Math.floor((count - 1) / 2), count - 1].map((i) => points[i]?.weekStart ?? "");

  return (
    <figure role="group" aria-label={summary} className="m-0 h-[196px] w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart data={points} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap={count <= 4 ? "54%" : count <= 13 ? "38%" : "28%"}>
          <CartesianGrid vertical={false} strokeDasharray="3 4" stroke="var(--color-border)" />
          <XAxis
            dataKey="weekStart"
            ticks={xTicks}
            interval={0}
            tickFormatter={(iso: string) => formatDayMonth(fromLocalISODate(iso))}
            tick={{ fill: "var(--color-fg-muted)", fontSize: 11 }}
            axisLine={{ stroke: "var(--color-border-strong)" }}
            tickLine={false}
          />
          <YAxis
            orientation="right"
            domain={[0, axisMax]}
            ticks={[0, axisMax / 2, axisMax]}
            tickFormatter={(v: number) => formatNumber(v, 0)}
            tick={{ fill: "var(--color-fg-muted)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip cursor={{ stroke: "var(--color-fg-muted)", strokeWidth: 1 }} content={({ active, payload }) => <WeekTooltip active={active} point={payload?.[0]?.payload as ChartPoint | undefined} unit={unit} />} />
          <Bar
            dataKey="value"
            fill="var(--color-data)"
            radius={count <= 13 ? [6, 6, 2, 2] : 2}
            isAnimationActive={animate}
            animationDuration={350}
          />
          <Line
            dataKey="trend"
            type="monotone"
            stroke="var(--color-fg)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            connectNulls
            isAnimationActive={animate}
            animationBegin={250}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </figure>
  );
}

function WeekTooltip({ active, point, unit }: { active?: boolean; point: ChartPoint | undefined; unit: WeightUnit }) {
  if (!active || !point) return null;
  const detail =
    point.sessions && point.value !== null
      ? `${plural(point.sessions, "treino", "treinos")} · média ${formatNumber(point.value, 0)} ${unit}`
      : point.sessions
        ? plural(point.sessions, "treino", "treinos")
        : "Sem treino nesta semana";
  return (
    <div className="flex animate-guf-fade flex-col gap-0.5 rounded-[10px] border border-border-strong bg-surface-3 px-2.5 py-2 whitespace-nowrap shadow-e2">
      <span className="text-xs leading-4 font-semibold">Semana de {formatDayMonth(fromLocalISODate(point.weekStart))}</span>
      <span className="text-xs leading-4 text-fg-secondary tabular-nums">{detail}</span>
    </div>
  );
}
