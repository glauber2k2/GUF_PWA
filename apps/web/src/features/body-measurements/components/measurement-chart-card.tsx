"use client";

import {
  formatCentimeters,
  formatCentimetersDelta,
  latestBothSides,
  MEASUREMENT_PERIODS,
  measurementChart,
  partSiteFor,
  sideDifferenceLabel,
  type BodyMeasurementDay,
  type MeasurementPart,
  type MeasurementPeriod,
  type MeasurementSide,
} from "@guf/core";
import { ProgressChart, SegmentedControl } from "@/shared/components/ds";

interface MeasurementChartCardProps {
  part: MeasurementPart;
  side: MeasurementSide;
  days: BodyMeasurementDay[];
  period: MeasurementPeriod;
  onPeriod: (period: MeasurementPeriod) => void;
  today: Date;
}

const SIDE_NAMES: Record<MeasurementSide, string> = { left: "esquerdo", right: "direito" };

/**
 * Gráfico de evolução do músculo (lado escolhido ou medida única), com período e, nos dois lados,
 * a diferença entre eles. Sem cor de "bom/ruim" e sem ponto de recorde.
 */
export function MeasurementChartCard({ part, side, days, period, onPeriod, today }: MeasurementChartCardProps) {
  const isBilateral = part.sites.kind === "bilateral";
  const chart = measurementChart(days, partSiteFor(part, side), period, today);
  const bothSides = latestBothSides(days, part);
  const sideName = SIDE_NAMES[side];
  const ariaLabel = `Circunferência de ${part.name}${isBilateral ? `, lado ${sideName}` : ""}, em centímetros`;

  return (
    <section aria-label="Gráfico de evolução" className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-5 shadow-e1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-base leading-[22px] font-bold">{isBilateral ? `Evolução · lado ${sideName}` : "Evolução"}</h2>
        <SegmentedControl
          options={[...MEASUREMENT_PERIODS]}
          value={period}
          onChange={(value) => onPeriod(value as MeasurementPeriod)}
          variant="solid"
          size="sm"
          label="Período"
          className="w-[150px] flex-none"
        />
      </div>

      {chart ? (
        <>
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-[44px] leading-none font-semibold tabular-nums">{formatCentimeters(chart.latest)}</span>
            <span className="text-sm text-fg-muted">cm</span>
            <span className="text-sm font-semibold text-fg-secondary tabular-nums">{formatCentimetersDelta(chart.delta)} cm</span>
          </div>
          <ProgressChart
            values={chart.values}
            startLabel={chart.startLabel}
            endLabel={chart.endLabel}
            unit="cm"
            pointLabels={chart.pointLabels}
            formatValue={(value) => `${formatCentimeters(value)} cm`}
            showHeader={false}
            showLegend={false}
            highlightMax={false}
            ariaLabel={ariaLabel}
          />
        </>
      ) : (
        <p className="m-0 py-8 text-center text-sm text-fg-secondary">Nenhum registro neste período.</p>
      )}

      {isBilateral && bothSides && (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-[13px] leading-[18px] text-fg-secondary">
          <span>Diferença entre os lados</span>
          <strong className="font-semibold text-fg tabular-nums">{sideDifferenceLabel(bothSides.left, bothSides.right)}</strong>
        </div>
      )}
    </section>
  );
}
