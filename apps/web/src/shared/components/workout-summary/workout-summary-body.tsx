"use client";

import type { ReactNode } from "react";
import { CalendarDays, Pencil } from "lucide-react";
import { editedAtLabel, plural, workoutDateTimeLabel } from "@guf/core";
import type { WorkoutSummaryBase } from "@guf/api";
import { Icon } from "@/shared/components/ds";
import { SummaryExerciseCard } from "./summary-exercise-card";
import { SummaryRecords } from "./summary-records";
import { SummaryStats } from "./summary-stats";

export interface WorkoutSummaryBodyProps {
  summary: WorkoutSummaryBase;
  /** Avisos acima da data (ex.: sem conexão, envio pendente). */
  notices?: ReactNode;
  /** Ações abaixo dos números (ex.: compartilhar nos Stories). */
  actions?: ReactNode;
  /** Abre a evolução do exercício (só no seu treino). */
  onOpenExercise?: (exerciseId: string) => void;
}

/** Conteúdo do resumo de um treino concluído: data, números, recordes e exercícios. Seu ou de outra pessoa. */
export function WorkoutSummaryBody({ summary, notices, actions, onOpenExercise }: WorkoutSummaryBodyProps) {
  const unit = summary.weightUnit;
  return (
    <div className="flex flex-col gap-4 pt-2">
      {notices}

      <span className="flex animate-guf-rise items-center gap-2 text-sm leading-5 text-fg-secondary tabular-nums">
        <Icon icon={CalendarDays} size={16} className="text-fg-muted" />
        {workoutDateTimeLabel(summary.performedOn, summary.startedAt)}
      </span>
      {summary.editedAt && (
        <span className="-mt-2 flex animate-guf-rise items-center gap-2 text-[13px] leading-[18px] text-fg-muted tabular-nums">
          <Icon icon={Pencil} size={14} />
          {editedAtLabel(summary.editedAt)}
        </span>
      )}

      <SummaryStats summary={summary} />
      {actions}
      {summary.records.length > 0 && <SummaryRecords records={summary.records} unit={unit} onOpenExercise={onOpenExercise} />}

      <section aria-labelledby="summary-exercises" className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between px-1 pt-1">
          <h2 id="summary-exercises" className="m-0 text-lg leading-6 font-semibold tracking-[-0.015em]">
            Exercícios
          </h2>
          <span className="text-[13px] text-fg-muted">{plural(summary.exercises.length, "exercício", "exercícios")}</span>
        </div>
        {summary.exercises.map((exercise, i) => (
          <SummaryExerciseCard key={exercise.id} exercise={exercise} unit={unit} index={i} onOpen={onOpenExercise} />
        ))}
      </section>
    </div>
  );
}
