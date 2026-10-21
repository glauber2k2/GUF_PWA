"use client";

import { Pause } from "lucide-react";
import { formatElapsed, formatNumber, pauseSummaryLabel, plural, toDisplayWeight } from "@guf/core";
import type { WorkoutSummaryBase } from "@guf/api";
import { Icon } from "@/shared/components/ds";
import { useCountUp } from "@/shared/hooks/use-count-up";
import { cn } from "@/shared/helpers/class-names";

const COUNT_UP = { delayMs: 120, durationMs: 700 };

/** Duração, volume e séries do treino (contam até o valor ao abrir) e as pausas. */
export function SummaryStats({ summary }: { summary: WorkoutSummaryBase }) {
  const unit = summary.weightUnit;
  const pauseText = pauseSummaryLabel(summary.pauseCount, summary.pausedSeconds);
  const duration = useCountUp(summary.durationSeconds, COUNT_UP);
  const volumeTarget = Math.round(toDisplayWeight(summary.volumeKg, unit) ?? 0);
  const volume = useCountUp(volumeTarget, COUNT_UP);
  const sets = useCountUp(summary.setCount, COUNT_UP);
  const stats = [
    { value: formatElapsed(duration), label: "Duração", aria: `Duração ${formatElapsed(summary.durationSeconds)}${pauseText ? ", tempo efetivo" : ""}` },
    { value: formatNumber(volume, 0), label: `Volume (${unit})`, aria: `Volume ${formatNumber(volumeTarget, 0)} ${unit}` },
    { value: String(sets), label: "Séries", aria: plural(summary.setCount, "série", "séries") },
  ];
  return (
    <section aria-label="Números do treino" className="flex flex-none animate-guf-rise flex-col gap-3.5 rounded-lg border border-border bg-surface px-2 pt-5 pb-4 shadow-e1 [animation-delay:40ms]">
      <div className="grid grid-cols-3">
        {stats.map((s, i) => (
          <div key={s.label} role="group" aria-label={s.aria} className={cn("flex flex-col items-center gap-1", i > 0 && "border-l border-border")}>
            <span aria-hidden="true" className="font-display text-[38px] leading-10 font-bold tracking-[-0.01em] tabular-nums">
              {s.value}
            </span>
            <span aria-hidden="true" className="text-xs leading-4 text-fg-muted">
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {pauseText && (
        <span className="mx-2 flex items-center justify-center gap-1.5 border-t border-border pt-3 text-[13px] leading-[18px] text-fg-secondary tabular-nums">
          <Icon icon={Pause} size={14} className="text-fg-muted" />
          {pauseText}
        </span>
      )}
    </section>
  );
}
