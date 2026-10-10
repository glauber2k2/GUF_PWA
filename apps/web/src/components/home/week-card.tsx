"use client";

import { ChevronRight } from "lucide-react";
import { formatShortDate, type WeekDay } from "@guf/core";
import { Icon, WeekStrip, type WeekStripDay } from "@/components/ds";

const POP_START_MS = 520;
const POP_STEP_MS = 90;

/** Card "Esta semana": contagem vs. meta e os 7 dias (seg–dom). */
export function WeekCard({
  week,
  trainedDays,
  count,
  goal,
  onOpenHistory,
  onSelectDay,
}: {
  week: WeekDay[];
  /** Datas "yyyy-MM-dd" com treino concluído. */
  trainedDays: ReadonlySet<string>;
  count: number;
  /** Meta semanal (só exibição); null = sem meta. */
  goal: number | null;
  onOpenHistory: () => void;
  onSelectDay: (iso: string) => void;
}) {
  let order = 0;
  const days: WeekStripDay[] = week.map((d) => {
    const done = trainedDays.has(d.iso);
    const state = done ? "done" : d.relation === "today" ? "today" : d.relation === "past" ? "past" : "future";
    const suffix = done ? " · treinou" : d.relation === "today" ? " · hoje" : "";
    return {
      key: d.iso,
      initial: d.initial,
      dayOfMonth: d.dayOfMonth,
      state,
      label: `${formatShortDate(d.date)}${suffix}`,
      popDelayMs: done ? POP_START_MS + order++ * POP_STEP_MS : undefined,
    };
  });

  return (
    <section aria-label="Esta semana" className="rounded-lg border border-border bg-surface px-4 pt-3 pb-4 shadow-e1">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenHistory}
          className={[
            "-ml-2 flex h-11 cursor-pointer items-center gap-1 rounded-[10px] bg-transparent px-2 text-lg font-semibold text-fg",
            "transition-[transform,background-color] duration-150 hover:bg-surface-3 active:scale-[.97] motion-reduce:active:scale-100",
          ].join(" ")}
        >
          Esta semana
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </button>
        <span className="text-sm text-fg-secondary">
          <b className="font-display text-xl font-semibold text-fg tabular-nums">{count}</b>
          {goal ? ` de ${goal} treinos` : count === 1 ? " treino" : " treinos"}
        </span>
      </div>
      <WeekStrip days={days} onSelectDay={onSelectDay} className="mt-1.5" />
    </section>
  );
}
