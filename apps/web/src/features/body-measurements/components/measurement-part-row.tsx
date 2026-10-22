"use client";

import Link from "next/link";
import { ChevronRight, Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import {
  formatCentimetersDelta,
  measurementTrend,
  partDelta,
  partValueLine,
  type BodyMeasurementDay,
  type MeasurementPart,
  type MeasurementTrend,
} from "@guf/core";
import { Icon, MuscleIcon } from "@/shared/components/ds";
import { measurementPartPath } from "@/features/body-measurements/helpers/paths";

const TREND_ICONS: Record<MeasurementTrend, LucideIcon> = { up: TrendingUp, down: TrendingDown, stable: Minus };

/**
 * Músculo na lista: ícone, valor mais recente (E/D nos dois lados) e a variação dos últimos 3 meses,
 * sem cor de "bom/ruim" (crescer ou diminuir depende do objetivo de cada pessoa).
 */
export function MeasurementPartRow({ part, days, today }: { part: MeasurementPart; days: BodyMeasurementDay[]; today: Date }) {
  const delta = partDelta(days, part, today);
  return (
    <Link
      href={measurementPartPath(part.key)}
      aria-label={`Ver evolução de ${part.name}`}
      className="flex items-center gap-3.5 border-b border-border p-3 text-fg no-underline transition-colors duration-150 ease-standard last:border-b-0 hover:bg-surface-elevated"
    >
      <span className="grid size-14 flex-none place-items-center overflow-hidden rounded-[14px] bg-surface-3">
        <MuscleIcon muscle={part.key} zoom size={54} animate="none" label="" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="text-[15px] leading-5 font-semibold">{part.name}</strong>
        <span className="font-display text-lg leading-[22px] font-semibold whitespace-nowrap tabular-nums">{partValueLine(days, part)}</span>
      </span>
      {delta !== null && (
        <span className="flex flex-none flex-col items-end gap-0.5">
          <span className="flex items-center gap-1 text-[13px] leading-[18px] font-semibold tabular-nums">
            <Icon icon={TREND_ICONS[measurementTrend(delta)]} size={14} className="text-fg-secondary" />
            {formatCentimetersDelta(delta)} cm
          </span>
          <span className="text-[11px] leading-[14px] text-fg-muted">em 3 meses</span>
        </span>
      )}
      <Icon icon={ChevronRight} size={18} className="flex-none text-fg-muted" />
    </Link>
  );
}
