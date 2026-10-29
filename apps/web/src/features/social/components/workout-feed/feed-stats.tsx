"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Trophy, Zap } from "lucide-react";
import { formatNumber } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { useCountUp } from "@/shared/hooks/use-count-up";

/** Número que conta de 0 até o valor (só no card animado). */
function CountUpNumber({ value }: { value: number }) {
  return formatNumber(useCountUp(value, { durationMs: 900, delayMs: 380 }), 0);
}

function FeedNumber({ value, isAnimated }: { value: number; isAnimated: boolean }) {
  return isAnimated ? <CountUpNumber value={value} /> : formatNumber(value, 0);
}

const STAT_TONES = {
  neutral: { box: "bg-surface-elevated", value: "text-fg" },
  record: { box: "bg-pr/12", value: "text-pr-text" },
  points: { box: "bg-accent/12", value: "text-accent-text" },
} as const;

function FeedStat({ label, tone, icon, children }: { label: string; tone: keyof typeof STAT_TONES; icon?: LucideIcon; children: ReactNode }) {
  const styles = STAT_TONES[tone];
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5 rounded-[12px] px-2.5 py-2", styles.box)}>
      <span className="truncate text-[10px] leading-3 font-semibold tracking-[0.08em] text-fg-muted uppercase">{label}</span>
      <span className={cn("flex items-center gap-1 font-display text-[22px] leading-6 font-bold tabular-nums", styles.value)}>
        {icon && <Icon icon={icon} size={14} />}
        {children}
      </span>
    </div>
  );
}

export interface FeedStatsProps {
  volume: number;
  unit: string;
  records: number;
  /** null = quem vê não pode ver os pontos (visitante): o quadro some. */
  points: number | null;
  isAnimated: boolean;
}

/** Volume, PRs e (para você e quem compete) os pontos do treino. */
export function FeedStats({ volume, unit, records, points, isAnimated }: FeedStatsProps) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1.5">
      <FeedStat label="Volume" tone="neutral">
        <span>
          <FeedNumber value={volume} isAnimated={isAnimated} />
          <span className="text-xs text-fg-secondary"> {unit}</span>
        </span>
      </FeedStat>
      <FeedStat label="PRs" tone="record" icon={Trophy}>
        <FeedNumber value={records} isAnimated={isAnimated} />
      </FeedStat>
      {points !== null && (
        <FeedStat label="Pontos" tone="points" icon={Zap}>
          +<FeedNumber value={points} isAnimated={isAnimated} />
        </FeedStat>
      )}
    </div>
  );
}
