"use client";

import { CalendarPlus, Check, TriangleAlert, Trophy, type LucideIcon } from "lucide-react";
import { isStreakRecord, STREAK_MESSAGES, streakStatus, weeklyGoalLabel, type StreakStatus, type StripWeek } from "@guf/core";
import type { StreakSummary } from "@guf/api";
import { Icon, StreakFlame } from "@/shared/components/ds";
import { StreakCount } from "@/shared/components/streak-count";
import { cn } from "@/shared/helpers/class-names";

const STATUS_MESSAGE: Record<StreakStatus, { icon: LucideIcon; badge: string }> = {
  secured: { icon: Check, badge: "bg-accent text-accent-foreground" },
  risk: { icon: TriangleAlert, badge: "bg-warning/18 text-warning" },
  zero: { icon: CalendarPlus, badge: "bg-surface-3 text-fg-secondary" },
};

/** Cor do card e do ícone: recorde (dourado) > em risco (alerta) > zerada > ativa (volt). */
const CARD_TONES: Record<StreakStatus | "record", { card: string; tile: string }> = {
  record: { card: "border-[1.5px] border-pr/50 bg-record-surface", tile: "bg-pr/18 text-pr-text" },
  risk: { card: "border-[1.5px] border-warning/45 bg-risk-surface", tile: "bg-warning/16 text-warning" },
  zero: { card: "border border-border bg-surface", tile: "bg-surface-3 text-fg-muted" },
  secured: { card: "border border-border bg-surface", tile: "bg-accent/16 text-accent-text" },
};

/**
 * Sequência de semanas do Histórico. Números SEMPRE do get_streak() (regra: 1 treino concluído
 * na semana dom–sáb mantém a sequência; a semana atual sem treino fica "em risco" até sábado).
 */
export function HistoryStreakCard({ streak, goal, weeks }: { streak: StreakSummary; goal: number | null; weeks: StripWeek[] }) {
  const status = streakStatus(streak);
  const record = isStreakRecord(streak);
  const trainedCount = weeks.filter((w) => w.trained).length;
  const message = STATUS_MESSAGE[status];
  const tone = CARD_TONES[record ? "record" : status];
  const best = streak.bestStreak;
  const bestUnit = best === 1 ? "semana" : "semanas";

  return (
    <section aria-label="Sequência de semanas" className={cn("flex flex-col gap-4 rounded-lg p-5 shadow-e1", tone.card)}>
      <div className="flex items-center gap-3.5">
        <span className={cn("grid size-[52px] flex-none place-items-center rounded-md", tone.tile)}>
          <StreakFlame size={32} animate={status === "risk" ? "flicker" : "none"} />
        </span>
        <StreakCount weeks={streak.currentStreak} record={record} />
        {record && (
          <span className="flex h-[26px] items-center gap-1 self-start rounded-pill bg-pr/18 px-2.5 text-xs font-bold whitespace-nowrap text-pr-text">
            <Icon icon={Trophy} size={13} />
            Recorde
          </span>
        )}
      </div>

      {best > 0 && (
        <span className={cn("-mt-1.5 text-[13px] leading-[18px] tabular-nums", record ? "font-semibold text-pr-text" : "text-fg-muted")}>
          {record ? `Seu recorde: ${best} ${bestUnit} – e contando` : `Recorde: ${best} ${bestUnit}`}
        </span>
      )}

      <div className="flex flex-col gap-1.5">
        <div role="img" aria-label={`Últimas ${weeks.length} semanas: ${trainedCount} com treino`} className="grid grid-cols-12 gap-1">
          {weeks.map((w) => (
            <span
              key={w.weekStart}
              className={cn(
                "h-[22px] rounded-[6px]",
                w.trained ? "bg-accent" : "bg-surface-3",
                w.current && "ring-[1.5px] ring-accent-text ring-offset-2 ring-offset-surface",
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-[11px] leading-4 text-fg-muted" aria-hidden="true">
          <span>{weeks.length} semanas atrás</span>
          <span>Esta semana</span>
        </div>
      </div>

      <div className="flex items-start gap-2.5 border-t border-border pt-3.5">
        <span className={cn("grid size-6 flex-none place-items-center rounded-pill", message.badge)}>
          <Icon icon={message.icon} size={14} />
        </span>
        <p className="m-0 text-sm leading-5 text-pretty">
          {status === "secured" ? (
            <>
              <strong className="font-semibold">{STREAK_MESSAGES.secured}</strong>
              {goal ? ` · ${weeklyGoalLabel(streak.currentWeekCount, goal)}` : null}
            </>
          ) : (
            STREAK_MESSAGES[status]
          )}
        </p>
      </div>
    </section>
  );
}
