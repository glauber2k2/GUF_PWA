"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { formatNumber, formatSigned } from "@guf/core";
import { cn } from "../helpers/class-names";
import { Icon } from "./brand";

export interface ProgressChartProps {
  values: number[];
  startLabel?: string;
  endLabel?: string;
  unit?: string;
  showHeader?: boolean;
  showLegend?: boolean;
  /** Ponto dourado no maior valor (recorde). Desligar onde "maior" não é conquista (ex.: medidas). */
  highlightMax?: boolean;
  /** Título de cada ponto no balão da agulha (ex.: "Semana de 5 out"), na ordem de `values`. */
  pointLabels?: readonly string[];
  /** Linha de apoio de cada ponto no balão (ex.: "3 treinos"). */
  pointDetails?: readonly (string | null)[];
  /** Valor no balão; padrão: número + unidade. */
  formatValue?: (value: number) => string;
  ariaLabel?: string;
  className?: string;
}

const CHART_W = 320;
const CHART_BASE = 130;
const CHART_TOP = 20;
/** Faixa (fração da largura) em que o balão encosta na borda em vez de centralizar na agulha. */
const TOOLTIP_EDGE = 0.2;

/** Índice do ponto mais perto da posição horizontal do dedo ou do mouse. */
function indexAtClientX(element: Element, clientX: number, count: number): number {
  if (count <= 1) return 0;
  const rect = element.getBoundingClientRect();
  const ratio = (clientX - rect.left) / (rect.width || 1);
  return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
}

/**
 * Gráfico de evolução em SVG próprio (linha azul de dados + área 16%), ponto dourado no maior valor
 * do período. Tocar ou arrastar mostra a agulha com o balão do ponto (como os gráficos do Recharts);
 * no teclado, as setas andam entre os pontos e Esc fecha.
 */
export function ProgressChart({
  values,
  startLabel = "",
  endLabel = "Hoje",
  unit = "kg",
  showHeader = true,
  showLegend = true,
  highlightMax = true,
  pointLabels,
  pointDetails,
  formatValue,
  ariaLabel,
  className,
}: ProgressChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const plotRef = useRef<HTMLDivElement>(null);
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
  const valueText = formatValue ?? ((v: number) => `${formatNumber(v)} ${unit}`);

  const activeValue = active === null ? undefined : values[active];
  const activeRatio = active === null ? 0 : x(active) / CHART_W;
  const activeTitle = active === null ? null : pointLabels?.[active];
  const activeDetail = active === null ? null : pointDetails?.[active];
  const activeSummary = activeValue === undefined ? "" : [activeTitle, valueText(activeValue), activeDetail].filter(Boolean).join(", ");

  const showAt = (event: PointerEvent<HTMLDivElement>) => {
    if (plotRef.current) setActive(indexAtClientX(plotRef.current, event.clientX, n));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") return setActive(null);
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    if (event.key === "Home") return setActive(0);
    if (event.key === "End") return setActive(n - 1);
    setActive((current) => Math.max(0, Math.min(n - 1, (current ?? n - 1) + (current === null ? 0 : step))));
  };

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
      <div
        ref={plotRef}
        role="group"
        tabIndex={0}
        aria-label={ariaLabel ? `${ariaLabel}. Use as setas para ver cada ponto.` : "Use as setas para ver cada ponto."}
        // Arrastar na horizontal move a agulha; na vertical, a página continua rolando.
        className="relative touch-pan-y rounded-sm outline-none select-none focus-visible:ring-2 focus-visible:ring-focus"
        onPointerDown={showAt}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse" || event.buttons > 0) showAt(event);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setActive(null);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
      >
        <svg viewBox="0 0 320 150" aria-hidden="true" className="h-auto w-full overflow-visible">
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
          {active !== null && activeValue !== undefined && (
            <g>
              <line x1={x(active)} y1={CHART_TOP - 12} x2={x(active)} y2={CHART_BASE} strokeWidth="1" className="stroke-fg-muted" />
              <circle
                cx={x(active)}
                cy={y(activeValue)}
                r="6"
                strokeWidth="2.5"
                className={cn("stroke-surface", highlightMax && active === maxIndex ? "fill-pr" : "fill-data")}
              />
            </g>
          )}
          <text x="0" y="146" className="fill-fg-muted font-sans text-[10px]">
            {startLabel}
          </text>
          <text x="320" y="146" textAnchor="end" className="fill-fg-muted font-sans text-[10px]">
            {endLabel}
          </text>
        </svg>
        {activeValue !== undefined && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -top-9 flex animate-guf-fade flex-col gap-0.5 rounded-[10px] border border-border-strong bg-surface-3 px-2.5 py-2 whitespace-nowrap shadow-e2",
              activeRatio < TOOLTIP_EDGE ? "translate-x-0" : activeRatio > 1 - TOOLTIP_EDGE ? "-translate-x-full" : "-translate-x-1/2",
            )}
            // Acompanha a agulha (posição contínua).
            style={{ left: `${activeRatio * 100}%` }}
          >
            {activeTitle && <span className="text-xs leading-4 text-fg-secondary tabular-nums">{activeTitle}</span>}
            <span className="text-[13px] leading-[18px] font-semibold tabular-nums">{valueText(activeValue)}</span>
            {activeDetail && <span className="text-xs leading-4 text-fg-secondary tabular-nums">{activeDetail}</span>}
          </div>
        )}
        <span aria-live="polite" className="sr-only">
          {activeSummary}
        </span>
      </div>
      {showLegend && highlightMax && (
        <span className="flex items-center gap-1.5 text-xs text-fg-muted">
          <span className="size-2.5 rounded-pill bg-pr" />
          Ponto dourado = recorde pessoal no período
        </span>
      )}
    </div>
  );
}
