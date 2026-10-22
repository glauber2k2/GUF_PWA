"use client";

import { useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Check, Trophy, type LucideIcon } from "lucide-react";
import { formatNumber, formatSigned, type SetType } from "@guf/core";
import { cn } from "../helpers/class-names";
import { Icon } from "./brand";

export interface ChipProps {
  label: string;
  selected?: boolean;
  defaultSelected?: boolean;
  onChange?: (selected: boolean) => void;
  icon?: LucideIcon;
  className?: string;
}

/** Chip de filtro (pílula). Selecionado = volt. */
export function Chip({ label, selected, defaultSelected = false, onChange, icon, className }: ChipProps) {
  const [inner, setInner] = useState(defaultSelected);
  const on = selected ?? inner;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        setInner(!on);
        onChange?.(!on);
      }}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-pill border px-3.5 text-sm font-medium whitespace-nowrap",
        "transition-transform duration-100 active:scale-[.96] motion-reduce:active:scale-100",
        on ? "border-accent bg-accent text-accent-foreground" : "border-border-strong bg-transparent text-fg",
        className,
      )}
    >
      {icon && <Icon icon={icon} size={16} />}
      {label}
    </button>
  );
}

export interface TagProps {
  children: ReactNode;
  size?: "sm" | "md";
  icon?: LucideIcon;
  tone?: "neutral" | "muted";
  className?: string;
}

export function Tag({ children, size = "md", icon, tone = "neutral", className }: TagProps) {
  const sm = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm whitespace-nowrap",
        sm ? "h-6 px-2 text-xs font-medium" : "h-7 px-2.5 text-[13px] font-normal",
        tone === "muted" ? "bg-transparent text-fg-muted" : "bg-surface-3 text-fg-secondary",
        className,
      )}
    >
      {icon && <Icon icon={icon} size={13} />}
      {children}
    </span>
  );
}

/** Tipo de série: letra + cor (A aquecimento, D drop set, F falha; normal mostra o número). */
export const SET_TYPE_META: Record<SetType, { letter: string; label: string; text: string; tint: string }> = {
  warmup: { letter: "A", label: "Aquecimento", text: "text-warning", tint: "bg-warning/16" },
  normal: { letter: "1", label: "Normal", text: "text-fg", tint: "bg-surface-3" },
  dropset: { letter: "D", label: "Drop set", text: "text-data", tint: "bg-data/16" },
  failure: { letter: "F", label: "Falha", text: "text-danger", tint: "bg-danger/16" },
};

export interface SetTypeTagProps {
  type?: SetType;
  /** Substitui a letra (ex.: número da série normal). */
  letter?: string;
  label?: string;
  className?: string;
}

export function SetTypeTag({ type = "normal", letter, label, className }: SetTypeTagProps) {
  const m = SET_TYPE_META[type];
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-semibold",
        m.tint,
        m.text,
        className,
      )}
    >
      <b className="font-display text-base">{letter ?? m.letter}</b>
      {label ?? m.label}
    </span>
  );
}

export interface PRBadgeProps {
  size?: "sm" | "md";
  label?: string;
  /** "Pop" de entrada (overshoot). Respeita prefers-reduced-motion. */
  animate?: boolean;
  className?: string;
}

/** Selo de recorde pessoal: sempre dourado + troféu. */
export function PRBadge({ size = "sm", label, animate = false, className }: PRBadgeProps) {
  const sm = size === "sm";
  return (
    <span
      className={cn(
        "inline-flex flex-none items-center rounded-pill bg-pr font-bold whitespace-nowrap text-pr-foreground",
        sm ? "h-[22px] gap-[3px] px-[7px] text-[11px]" : "h-7 gap-[5px] px-2.5 text-[13px]",
        animate && "animate-guf-pop-badge",
        className,
      )}
    >
      <Icon icon={Trophy} size={sm ? 12 : 14} />
      {label ?? (sm ? "PR" : "Recorde pessoal")}
    </span>
  );
}

export interface PRHighlightProps {
  label: string;
  value: string;
  className?: string;
}

/** Destaque de recorde: fundo dourado 14% + brilho (glow 32px). */
export function PRHighlight({ label, value, className }: PRHighlightProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-pr/50 bg-pr-highlight px-4 py-3 shadow-pr-glow",
        className,
      )}
    >
      <div className="grid size-10 flex-none place-items-center rounded-pill bg-pr text-pr-foreground">
        <Icon icon={Trophy} size={20} />
      </div>
      <div className="grid">
        <span className="text-xs font-semibold text-pr-text">{label}</span>
        <span className="font-display text-[26px] font-bold tabular-nums">{value}</span>
      </div>
    </div>
  );
}

export interface ProgressChartProps {
  values: number[];
  startLabel?: string;
  endLabel?: string;
  unit?: string;
  showHeader?: boolean;
  showLegend?: boolean;
  /** Ponto dourado no maior valor (recorde). Desligar onde "maior" não é conquista (ex.: medidas). */
  highlightMax?: boolean;
  ariaLabel?: string;
  className?: string;
}

const CHART_W = 320;
const CHART_BASE = 130;
const CHART_TOP = 20;

/**
 * Gráfico de evolução em SVG próprio (linha azul de dados + área 16%),
 * ponto dourado no maior valor do período. Telas de evolução usarão Recharts.
 */
export function ProgressChart({
  values,
  startLabel = "",
  endLabel = "Hoje",
  unit = "kg",
  showHeader = true,
  showLegend = true,
  highlightMax = true,
  ariaLabel,
  className,
}: ProgressChartProps) {
  const n = values.length;
  if (!n) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => (n > 1 ? (i / (n - 1)) * CHART_W : CHART_W / 2);
  const y = (v: number) => CHART_BASE - ((v - min) / (max - min || 1)) * (CHART_BASE - CHART_TOP);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const area = `M0,${CHART_BASE} L${points.join(" L")} L${CHART_W},${CHART_BASE} Z`;
  const maxIndex = values.lastIndexOf(max);
  const now = values[n - 1] ?? 0;
  const delta = now - (values[0] ?? 0);
  const up = delta >= 0;

  return (
    <div className={cn("grid gap-4", className)}>
      {showHeader && (
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[44px] leading-none font-semibold tabular-nums">{formatNumber(now)}</span>
          <span className="text-sm text-fg-muted">{unit}</span>
          <span className={cn("flex items-center gap-0.5 text-sm font-semibold", up ? "text-success" : "text-danger")}>
            <Icon icon={up ? ArrowUpRight : ArrowDownRight} size={15} />
            {`${formatSigned(delta)} ${unit}`}
          </span>
        </div>
      )}
      <svg viewBox="0 0 320 150" className="h-auto w-full overflow-visible" role="img" aria-label={ariaLabel}>
        <line x1="0" y1="20" x2="320" y2="20" strokeDasharray="3 4" className="stroke-border" />
        <line x1="0" y1="75" x2="320" y2="75" strokeDasharray="3 4" className="stroke-border" />
        <line x1="0" y1="130" x2="320" y2="130" className="stroke-border" />
        <path d={area} className="fill-data/16" />
        <polyline
          points={points.join(" ")}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="fill-none stroke-data"
        />
        {highlightMax && <circle cx={x(maxIndex)} cy={y(max)} r="9" className="fill-pr/30" />}
        {highlightMax && <circle cx={x(maxIndex)} cy={y(max)} r="4.5" strokeWidth="2" className="fill-pr stroke-surface" />}
        <text x="0" y="146" className="fill-fg-muted font-sans text-[10px]">
          {startLabel}
        </text>
        <text x="320" y="146" textAnchor="end" className="fill-fg-muted font-sans text-[10px]">
          {endLabel}
        </text>
      </svg>
      {showLegend && highlightMax && (
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <span className="size-2.5 rounded-pill bg-pr" />
          Ponto dourado = recorde pessoal no período
        </span>
      )}
    </div>
  );
}

/** Intensidade de volume do dia: 0 (sem treino) a 3 (maior volume). */
export type VolumeLevel = 0 | 1 | 2 | 3;

const CALENDAR_LEVELS: Record<VolumeLevel, string> = {
  0: "bg-surface-3",
  1: "bg-volume-1",
  2: "bg-volume-2",
  3: "bg-accent",
};

const WEEKDAY_INITIALS = ["D", "S", "T", "Q", "Q", "S", "S"];

export interface MonthCalendarProps {
  monthLabel?: string;
  /** Nome do mês em minúsculas, para os rótulos acessíveis ("6 de outubro"). */
  monthName: string;
  daysInMonth: number;
  /** Dia da semana do dia 1 (0 = domingo). */
  startWeekday: number;
  levels?: Partial<Record<number, VolumeLevel>>;
  today?: number;
  selected?: number;
  defaultSelected?: number;
  onSelect?: (day: number) => void;
  showLegend?: boolean;
  className?: string;
}

export function MonthCalendar({
  monthLabel,
  monthName,
  daysInMonth,
  startWeekday,
  levels = {},
  today,
  selected,
  defaultSelected,
  onSelect,
  showLegend = true,
  className,
}: MonthCalendarProps) {
  const [inner, setInner] = useState(defaultSelected ?? today);
  const current = selected ?? inner;

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return (
    <div className={cn("grid gap-4", className)}>
      {monthLabel && <span className="text-sm font-semibold">{monthLabel}</span>}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_INITIALS.map((w, i) => (
          <span key={`w${i}`} className="text-[11px] font-semibold text-fg-muted" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: startWeekday }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {days.map((d) => {
          const future = today !== undefined && d > today;
          const level: VolumeLevel = future ? 0 : (levels[d] ?? 0);
          const isToday = d === today;
          return (
            <button
              key={d}
              type="button"
              aria-label={`${d} de ${monthName}${level ? ", treinou" : ""}${isToday ? ", hoje" : ""}`}
              aria-pressed={current === d}
              onClick={() => {
                setInner(d);
                onSelect?.(d);
              }}
              className={cn(
                "aspect-square min-h-10 cursor-pointer rounded-[10px] font-display text-[17px] font-semibold tabular-nums",
                CALENDAR_LEVELS[level],
                level >= 2 ? "text-accent-foreground" : "text-fg",
                isToday && "outline-2 -outline-offset-2 outline-fg outline-solid",
                future && "opacity-45",
                current === d && "ring-2 ring-data",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
      {showLegend && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          Volume
          {([0, 1, 2, 3] as const).map((lv) => (
            <span key={lv} className={cn("size-3.5 rounded-[4px]", CALENDAR_LEVELS[lv])} />
          ))}
          maior ·
          <span className="size-3.5 rounded-[4px] outline-2 -outline-offset-2 outline-fg outline-solid" />
          hoje
        </div>
      )}
    </div>
  );
}

/** Divisor com texto central ("ou") entre métodos de acesso. */
export function TextDivider({ label = "ou", className }: { label?: string; className?: string }) {
  return (
    <div role="separator" aria-label={label} className={cn("flex items-center gap-3 text-[13px] text-fg-muted", className)}>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <span aria-hidden="true">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  );
}

export type WeekDayState = "done" | "today" | "past" | "future";

export interface WeekStripDay {
  /** Chave estável (data "yyyy-MM-dd"). */
  key: string;
  /** Inicial do dia ("S", "T"…). */
  initial: string;
  dayOfMonth: number;
  state: WeekDayState;
  /** Rótulo acessível: "Sexta, 9 out · treinou". */
  label: string;
  /** Atraso da animação de "pop" dos dias treinados (ms, escalonado). */
  popDelayMs?: number;
}

const WEEK_CIRCLE: Record<WeekDayState, string> = {
  done: "grid place-items-center bg-accent text-accent-foreground animate-guf-pop-in",
  today: "border-2 border-accent-text bg-accent/12",
  past: "bg-surface-3",
  future: "border border-dashed border-border-strong opacity-70",
};

/** Semana de domingo a sábado: treinou (volt), hoje (contorno), passado e futuro. */
export function WeekStrip({
  days,
  onSelectDay,
  className,
}: {
  days: WeekStripDay[];
  /** Toque em um dia treinado (abre o resumo do dia). */
  onSelectDay?: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-7", className)}>
      {days.map((d) => {
        const interactive = d.state === "done" && Boolean(onSelectDay);
        return (
          <button
            key={d.key}
            type="button"
            aria-label={d.label}
            aria-current={d.state === "today" ? "date" : undefined}
            disabled={!interactive}
            onClick={interactive ? () => onSelectDay?.(d.key) : undefined}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1.5 bg-transparent py-1 text-fg-muted",
              interactive
                ? "cursor-pointer transition-transform duration-100 ease-standard active:scale-[.94] motion-reduce:active:scale-100"
                : "cursor-default",
            )}
          >
            <span className="text-[11px] leading-4 font-semibold" aria-hidden="true">
              {d.initial}
            </span>
            <span
              aria-hidden="true"
              className={cn("size-[38px] rounded-pill", WEEK_CIRCLE[d.state])}
              style={d.state === "done" && d.popDelayMs ? { animationDelay: `${d.popDelayMs}ms` } : undefined}
            >
              {d.state === "done" && <Icon icon={Check} size={20} />}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "text-[13px] leading-4 tabular-nums",
                d.state === "today" ? "font-bold text-fg" : "font-medium",
                d.state === "future" ? "text-fg-muted" : d.state !== "today" && "text-fg-secondary",
              )}
            >
              {d.dayOfMonth}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export interface StatItem {
  label: string;
  value: string;
  unit?: string;
}

/** Números de um treino (Duração · Volume · Séries) em Barlow. */
export function StatGrid({ stats, className }: { stats: StatItem[]; className?: string }) {
  return (
    <dl className={cn("m-0 grid auto-cols-fr grid-flow-col gap-2", className)}>
      {stats.map((s) => (
        <div key={s.label} className="flex min-w-0 flex-col gap-1">
          <dt className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">{s.label}</dt>
          <dd className="m-0 font-display text-[28px] leading-7 font-semibold tabular-nums">
            {s.value}
            {s.unit && <span className="text-base text-fg-secondary">{s.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
