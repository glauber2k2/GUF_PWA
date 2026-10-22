"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { monthGrid, monthLabel, monthsBack, shiftMonth, startOfMonthOf, toLocalISODate, fromLocalISODate } from "@guf/core";
import { Icon, IconButton, MonthCalendar, SegmentedControl } from "@/shared/components/ds";

export type MeasurementDateMode = "today" | "other";

const DATE_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "other", label: "Outro dia" },
];

interface MeasurementDateCardProps {
  mode: MeasurementDateMode;
  onMode: (mode: MeasurementDateMode) => void;
  /** Data escolhida "2026-10-15". */
  measuredOn: string;
  onSelect: (iso: string) => void;
  dateLabel: string;
  /** O dia já tem medição: os valores preenchidos substituem os anteriores. */
  hasConflict: boolean;
  today: Date;
  /** Editando um registro: a data é a dele e não muda (só o rótulo aparece). */
  isLocked?: boolean;
}

/** Data da medição (protótipo 1f/1g): "Hoje" é o padrão; "Outro dia" abre o calendário sem dias futuros. */
export function MeasurementDateCard({ mode, onMode, measuredOn, onSelect, dateLabel, hasConflict, today, isLocked = false }: MeasurementDateCardProps) {
  const [month, setMonth] = useState(() => startOfMonthOf(fromLocalISODate(measuredOn)));
  const cells = monthGrid(month);
  const days = cells.filter((cell) => cell !== null);
  const isCurrentMonth = monthsBack(month, today) === 0;
  const selected = days.find((cell) => cell.iso === measuredOn)?.day;
  const todayIso = toLocalISODate(today);

  const select = (day: number) => {
    const iso = days[day - 1]?.iso;
    if (iso && iso <= todayIso) onSelect(iso);
  };

  return (
    <section aria-label="Data da medição" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Data</span>
        <span className="text-sm leading-5 font-semibold">{dateLabel}</span>
      </div>
      {!isLocked && <SegmentedControl options={DATE_OPTIONS} value={mode} onChange={(value) => onMode(value as MeasurementDateMode)} label="Data da medição" />}

      {mode === "other" && !isLocked && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <IconButton icon={ChevronLeft} label="Mês anterior" variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))} />
            <span className="text-sm font-semibold">{monthLabel(month)}</span>
            <IconButton icon={ChevronRight} label="Próximo mês" variant="ghost" disabled={isCurrentMonth} onClick={() => setMonth(shiftMonth(month, 1))} />
          </div>
          <MonthCalendar
            monthName={monthLabel(month).split(" ")[0]?.toLowerCase() ?? ""}
            daysInMonth={days.length}
            startWeekday={cells.length - days.length}
            today={isCurrentMonth ? today.getDate() : undefined}
            // 0 = nenhum dia deste mês (o calendário não marca o "hoje" por conta própria).
            selected={selected ?? 0}
            onSelect={select}
            showLegend={false}
          />
        </div>
      )}

      {hasConflict && (
        <div className="flex items-start gap-2.5 rounded-md bg-info/14 px-3 py-2.5 text-[13px] leading-[18px] text-fg">
          <Icon icon={Info} size={16} className="mt-px flex-none text-info" />
          <span className="text-pretty">Já existe uma medição nesse dia. Os valores preenchidos substituem os anteriores.</span>
        </div>
      )}
    </section>
  );
}
