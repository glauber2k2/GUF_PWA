"use client";

import { Check, Clock, Trophy, Zap } from "lucide-react";
import { isStreakRecord, STREAK_MESSAGES, streakStatus, weeklyGoalLabel } from "@guf/core";
import type { StreakSummary } from "@guf/api";
import { Icon } from "@/components/ds";
import { StreakCount } from "@/components/streak/streak-count";
import { cn } from "@/lib/utils";

/** Barras da meta semanal (só exibição): preenchidas até a contagem da semana. */
function GoalSegments({ goal, count }: { goal: number; count: number }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1.5" aria-hidden="true">
      {Array.from({ length: goal }, (_, i) => (
        <span
          key={i}
          className={cn("h-2 rounded-pill transition-colors duration-250", i < count ? "bg-accent" : "bg-surface-3")}
        />
      ))}
    </div>
  );
}

/**
 * Card de sequência de semanas.
 * Regra (CLAUDE.md): 1 treino concluído na semana (seg–dom) mantém a sequência;
 * weekly_goal é só exibição.
 */
export function StreakCard({ streak, goal }: { streak: StreakSummary; goal: number | null }) {
  const status = streakStatus(streak);
  const record = isStreakRecord(streak);
  const count = streak.currentWeekCount;

  if (status === "zero") {
    return (
      <section aria-label="Sequência de semanas" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-e1">
        <div className="flex items-center gap-3.5">
          <span className="grid size-[52px] flex-none place-items-center rounded-md bg-accent/16 text-accent-text">
            <Icon icon={Zap} size={28} />
          </span>
          <div className="flex flex-col gap-0.5">
            <h3 className="m-0 text-lg leading-6 font-semibold text-pretty">Comece sua sequência esta semana</h3>
            <span className="text-sm leading-5 text-pretty text-fg-secondary">{STREAK_MESSAGES.zero}</span>
          </div>
        </div>
        {goal ? <GoalSegments goal={goal} count={count} /> : null}
      </section>
    );
  }

  const risk = status === "risk";

  return (
    <section
      aria-label="Sequência de semanas"
      className={cn(
        "flex flex-col gap-4 rounded-lg p-5 shadow-e1",
        risk ? "border-[1.5px] border-warning/45 bg-risk-surface" : "border border-border bg-surface",
      )}
    >
      <div className="flex items-center gap-3.5">
        <span
          className={cn(
            "grid size-[52px] flex-none place-items-center rounded-md",
            risk ? "bg-warning/16 text-warning" : record ? "bg-pr/18 text-pr-text" : "bg-accent/16 text-accent-text",
          )}
        >
          <Icon icon={Zap} size={28} />
        </span>
        <StreakCount weeks={streak.currentStreak} />
        {risk && (
          <span className="flex h-6 items-center gap-1 self-start rounded-pill bg-warning/16 px-2 text-xs font-semibold whitespace-nowrap text-warning">
            <Icon icon={Clock} size={12} />
            Em risco
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {goal ? <GoalSegments goal={goal} count={count} /> : null}
        <p className="m-0 text-sm leading-5 text-pretty text-fg">
          {status === "secured" ? (
            <>
              <span className="inline-flex items-center gap-1 font-semibold">
                {STREAK_MESSAGES.secured}
                <Icon icon={Check} size={16} className="text-accent-text" label="concluída" />
              </span>
              {goal ? <span className="text-fg-secondary"> · {weeklyGoalLabel(count, goal)}</span> : null}
            </>
          ) : (
            STREAK_MESSAGES.risk
          )}
        </p>
      </div>

      <div className="border-t border-border pt-3">
        {record ? (
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-pr-text">
            <Icon icon={Trophy} size={16} />
            Recorde pessoal: esta é sua maior sequência
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
            <Icon icon={Trophy} size={14} />
            Seu recorde: {streak.bestStreak} {streak.bestStreak === 1 ? "semana" : "semanas"}
          </span>
        )}
      </div>
    </section>
  );
}
