"use client";

import { CalendarDays, Check } from "lucide-react";
import type { FinishedWorkoutSummary } from "@guf/api";
import { formatElapsed, formatNumber, formatShortDate, fromLocalISODate, TIMES_SIGN } from "@guf/core";
import { Button, Icon, PRHighlight, WorkoutSummaryCard } from "@/components/ds";
import { useCountUp } from "@/hooks/use-count-up";

export interface WorkoutSummaryProps {
  name: string;
  projectName: string | null;
  performedOn: string;
  summary: FinishedWorkoutSummary;
  onDone: () => void;
  onOpenHistory: () => void;
}

/** Resumo do treino concluído: números contando e recordes do dia em dourado. */
export function WorkoutSummary({ name, projectName, performedOn, summary, onDone, onOpenHistory }: WorkoutSummaryProps) {
  const volume = useCountUp(Math.round(summary.volumeKg), { delayMs: 250 });
  const sets = useCountUp(summary.setCount, { delayMs: 250 });
  const prs = summary.personalRecords;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col gap-4 px-4 pt-[calc(28px+env(safe-area-inset-top))] pb-[calc(24px+env(safe-area-inset-bottom))]">
      <div className="flex animate-guf-rise flex-col gap-2">
        <span className="grid size-14 animate-guf-pop-in place-items-center rounded-lg bg-accent text-accent-foreground [animation-delay:200ms]">
          <Icon icon={Check} size={30} />
        </span>
        {projectName && (
          <span className="mt-2 text-[11px] leading-4 font-semibold tracking-[0.08em] text-accent-text uppercase">{projectName}</span>
        )}
        <h1 className="m-0 font-display text-[56px] leading-[56px] font-bold tracking-[-0.01em]">Treino concluído</h1>
      </div>

      <div className="animate-guf-rise [animation-delay:120ms]">
        <WorkoutSummaryCard
          title={name}
          date={formatShortDate(fromLocalISODate(performedOn))}
          stats={[
            { value: formatElapsed(summary.durationSeconds), label: "Duração" },
            { value: formatNumber(volume, 0), label: "Volume kg" },
            { value: String(sets), label: "Séries" },
          ]}
          prs={prs.length}
        />
      </div>

      {prs.length > 0 && (
        <>
          <span className="mt-2 text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">
            Recordes pessoais
          </span>
          {prs.map((pr, i) => (
            <div key={`${pr.exerciseName}-${i}`} className="animate-guf-rise" style={{ animationDelay: `${300 + i * 120}ms` }}>
              <PRHighlight label={`Maior carga · ${pr.exerciseName}`} value={`${formatNumber(pr.weightKg)} kg ${TIMES_SIGN} ${pr.reps}`} />
            </div>
          ))}
        </>
      )}

      <div className="mt-auto flex flex-col gap-1 pt-6">
        <Button size="lg" fullWidth onClick={onDone}>
          Concluir
        </Button>
        <Button variant="ghost" icon={CalendarDays} fullWidth onClick={onOpenHistory}>
          Ver no histórico
        </Button>
      </div>
    </main>
  );
}
