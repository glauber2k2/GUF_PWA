"use client";

import { useRef, type PointerEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  dayIntensity,
  formatNumber,
  monthGrid,
  monthLabel,
  monthSummary,
  plural,
  toDisplayWeight,
  toLocalISODate,
  type DayLevel,
  type WeightUnit,
} from "@guf/core";
import type { TrainingDay } from "@guf/api";
import { Icon, IconButton, Skeleton } from "@/components/ds";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { initial: "S", name: "segunda" },
  { initial: "T", name: "terça" },
  { initial: "Q", name: "quarta" },
  { initial: "Q", name: "quinta" },
  { initial: "S", name: "sexta" },
  { initial: "S", name: "sábado" },
  { initial: "D", name: "domingo" },
];

/** Realce do dia treinado por volume (tokens do design system, como no MonthCalendar). */
const LEVEL_CLASSES: Record<DayLevel, string> = {
  1: "bg-volume-1 text-fg",
  2: "bg-volume-2 text-accent-foreground",
  3: "bg-accent text-accent-foreground",
};

const SWIPE_MIN_PX = 48;

export interface TrainingCalendarProps {
  month: Date;
  today: Date;
  /** Dias treinados do mês; undefined enquanto carrega. */
  days: TrainingDay[] | undefined;
  /** Tercis de volume das últimas semanas (realce comparável entre meses). */
  tertiles: [number, number] | null;
  unit: WeightUnit;
  /** Usuário ainda sem treinos: mostra a mensagem de primeiro treino. */
  empty: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  /** Direção da última troca de mês (anima a entrada pelo lado certo). */
  direction: "back" | "forward" | null;
  onChangeMonth: (delta: -1 | 1) => void;
  onSelectDay: (iso: string) => void;
}

/** Calendário mensal de dias treinados (semana de segunda a domingo), com troca por setas ou deslize. */
export function TrainingCalendar({
  month,
  today,
  days,
  tertiles,
  unit,
  empty,
  canGoBack,
  canGoForward,
  direction,
  onChangeMonth,
  onSelectDay,
}: TrainingCalendarProps) {
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const byDay = new Map((days ?? []).map((d) => [d.performedOn, d]));
  const monthName = monthLabel(month);
  const todayIso = toLocalISODate(today);

  const go = (delta: -1 | 1) => {
    if (delta === -1 ? canGoBack : canGoForward) onChangeMonth(delta);
  };
  const onPointerDown = (e: PointerEvent) => {
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > SWIPE_MIN_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) go(dx > 0 ? -1 : 1);
  };

  return (
    <section aria-label="Calendário de dias treinados" className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 pt-4 pb-[18px] shadow-e1">
      <div className="flex items-center gap-1">
        <h2 aria-live="polite" className="m-0 ml-1 flex-1 text-lg leading-6 font-semibold tracking-[-0.015em]">
          {monthName}
        </h2>
        <IconButton icon={ChevronLeft} label="Mês anterior" variant="ghost" disabled={!canGoBack} onClick={() => go(-1)} />
        <IconButton icon={ChevronRight} label="Próximo mês" variant="ghost" disabled={!canGoForward} onClick={() => go(1)} />
      </div>

      <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} className="touch-pan-y overflow-hidden">
        <div
          key={monthName}
          className={cn(
            "grid grid-cols-7 gap-y-1",
            direction === "back" && "animate-guf-from-left",
            direction === "forward" && "animate-guf-from-right",
          )}
        >
          {WEEKDAYS.map((w, i) => (
            <abbr key={i} title={w.name} className="grid h-6 place-items-center text-[11px] font-semibold text-fg-muted no-underline">
              {w.initial}
            </abbr>
          ))}
          {monthGrid(month).map((cell, i) => {
            if (!cell) return <span key={`blank-${i}`} />;
            if (!days) return <Skeleton key={cell.iso} className="mx-auto my-[3px] size-[38px] rounded-pill" />;
            const day = byDay.get(cell.iso);
            const isToday = cell.iso === todayIso;
            const future = cell.iso > todayIso;
            const label = [
              `${WEEKDAYS[cell.weekdayIndex]?.name}, ${cell.day}`,
              day ? plural(day.sessions, "treino", "treinos") : "sem treino",
              isToday ? "hoje" : null,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={cell.iso}
                type="button"
                aria-label={label}
                disabled={!day}
                onClick={() => onSelectDay(cell.iso)}
                className={cn("grid h-11 place-items-center p-0", day ? "cursor-pointer" : "cursor-default", future && "opacity-40")}
              >
                <span
                  className={cn(
                    "grid size-[38px] place-items-center rounded-pill font-display text-[17px] font-semibold tabular-nums",
                    "transition-transform duration-100 ease-standard active:scale-[.94] motion-reduce:active:scale-100",
                    day ? LEVEL_CLASSES[dayIntensity(day.volumeKg, tertiles)] : "text-fg-secondary",
                    isToday && "ring-2 ring-accent-text ring-offset-2 ring-offset-surface",
                  )}
                >
                  {cell.day}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {empty ? (
        <div className="flex items-center gap-3 rounded-md border border-dashed border-border-strong p-3.5">
          <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
            <Icon icon={CalendarDays} size={22} />
          </span>
          <span className="text-sm leading-5 text-pretty text-fg-secondary">Seus treinos aparecem aqui. Comece o primeiro pelo botão Treinar.</span>
        </div>
      ) : (
        <>
          <span className="border-t border-border px-1 pt-2.5 text-sm leading-5 text-fg-secondary tabular-nums">
            {days ? monthSummaryLabel(days, unit) : " "}
          </span>
          <div className="flex items-center gap-1.5 px-1 text-xs text-fg-muted" aria-hidden="true">
            <span>Volume</span>
            {([1, 2, 3] as const).map((lv) => (
              <span key={lv} className={cn("size-3.5 rounded-pill", LEVEL_CLASSES[lv])} />
            ))}
            <span>maior</span>
            <span className="ml-2 size-3.5 rounded-pill ring-2 ring-accent-text ring-inset" />
            <span>hoje</span>
          </div>
        </>
      )}
    </section>
  );
}

/** "12 treinos · 10 dias · 98.400 kg de volume" */
function monthSummaryLabel(days: TrainingDay[], unit: WeightUnit): string {
  const summary = monthSummary(days);
  if (summary.sessions === 0) return "Nenhum treino neste mês";
  const volume = formatNumber(toDisplayWeight(summary.volumeKg, unit) ?? 0, 0);
  return `${plural(summary.sessions, "treino", "treinos")} · ${plural(summary.trainedDays, "dia", "dias")} · ${volume} ${unit} de volume`;
}
