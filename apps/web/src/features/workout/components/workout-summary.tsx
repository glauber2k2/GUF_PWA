"use client";

import { CalendarDays, Check, Share2 } from "lucide-react";
import type { FinishedWorkoutSummary } from "@guf/api";
import {
  formatElapsed,
  formatNumber,
  formatShortDate,
  fromLocalISODate,
  TIMES_SIGN,
  toDisplayWeight,
  type WeightUnit,
} from "@guf/core";
import { Banner, Button, Icon, PRHighlight, WorkoutSummaryCard } from "@/shared/components/ds";
import { useCountUp } from "@/shared/hooks/use-count-up";

export interface WorkoutSummaryProps {
  name: string;
  projectName: string | null;
  performedOn: string;
  summary: FinishedWorkoutSummary;
  unit: WeightUnit;
  /** Finalizado sem internet: será enviado quando a conexão voltar. */
  pending?: boolean;
  onDone: () => void;
  onOpenHistory: () => void;
  /** Abre a folha de stories (só quando o treino já está no servidor). */
  onShare?: () => void;
}

/** Resumo do treino concluído: números contando e recordes do dia em dourado. */
export function WorkoutSummary({
  name,
  projectName,
  performedOn,
  summary,
  unit,
  pending = false,
  onDone,
  onOpenHistory,
  onShare,
}: WorkoutSummaryProps) {
  const volume = useCountUp(Math.round(toDisplayWeight(summary.volumeKg, unit) ?? 0), { delayMs: 250 });
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
            { value: formatNumber(volume, 0), label: `Volume ${unit}` },
            { value: String(sets), label: "Séries" },
          ]}
          prs={prs.length}
        />
      </div>

      {summary.pauseCount > 0 && (
        <span className="text-[13px] text-fg-muted">
          Tempo efetivo, sem as pausas · {summary.pauseCount === 1 ? "1 pausa" : `${summary.pauseCount} pausas`} ·{" "}
          {formatElapsed(Math.max(0, summary.elapsedSeconds - summary.durationSeconds))} parado
        </span>
      )}

      {pending && (
        <Banner tone="warning" title="Sem conexão">
          o treino está salvo no aparelho e vai para o histórico quando a internet voltar.
        </Banner>
      )}

      {prs.length > 0 && (
        <>
          <span className="mt-2 text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Recordes pessoais</span>
          {prs.map((pr, i) => (
            <div key={`${pr.exerciseName}-${i}`} className="animate-guf-rise" style={{ animationDelay: `${300 + i * 120}ms` }}>
              <PRHighlight
                label={`Recorde · ${pr.exerciseName}`}
                value={`${formatNumber(toDisplayWeight(pr.weightKg, unit) ?? 0)} ${unit} ${TIMES_SIGN} ${pr.reps}`}
              />
            </div>
          ))}
        </>
      )}

      <div className="mt-auto flex flex-col gap-1 pt-6">
        {onShare && !pending && (
          <Button variant="secondary" size="lg" icon={Share2} fullWidth onClick={onShare} className="mb-1">
            Compartilhar nos Stories
          </Button>
        )}
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
