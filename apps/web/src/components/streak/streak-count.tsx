"use client";

import { streakWords } from "@guf/core";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

/** "6 semanas / seguidas treinando" — número animado; dourado quando é recorde. Usado na Início e no Histórico. */
export function StreakCount({ weeks, record = false }: { weeks: number; record?: boolean }) {
  const animated = useCountUp(weeks);
  const words = streakWords(weeks);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="m-0 flex items-baseline gap-1.5" aria-label={`${weeks} ${words.unit} ${words.caption}`}>
        <span
          aria-hidden="true"
          className={cn("font-display text-[56px] leading-[52px] font-bold tracking-[-0.01em] tabular-nums", record && "text-pr-text")}
        >
          {animated}
        </span>
        <span aria-hidden="true" className="font-display text-[26px] leading-7 font-semibold">
          {words.unit}
        </span>
      </p>
      <span className="text-[13px] leading-[18px] text-fg-secondary" aria-hidden="true">
        {words.caption}
      </span>
    </div>
  );
}
