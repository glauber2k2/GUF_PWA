"use client";

import { ChevronRight, NotepadText, TrendingUp } from "lucide-react";
import { formatNumber, muscleGroupLabel, plural, setMarks, TIMES_SIGN, toDisplayWeight, type WeightUnit } from "@guf/core";
import type { SummaryExercise } from "@guf/api";
import { Icon, PRBadge, SET_TYPE_META, Tag } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

export interface SummaryExerciseCardProps {
  exercise: SummaryExercise;
  unit: WeightUnit;
  index: number;
  /** Abre a evolução do exercício; sem ele (treino de outra pessoa), o cabeçalho não é tocável. */
  onOpen?: (exerciseId: string) => void;
}

/** Exercício do resumo: nome, grupo, séries concluídas e observação. */
export function SummaryExerciseCard({ exercise, unit, index, onOpen }: SummaryExerciseCardProps) {
  const group = muscleGroupLabel(exercise.muscleGroup);
  const marks = setMarks(exercise.sets.map((s) => s.setType));

  return (
    <article
      // Entrada escalonada (atraso dinâmico).
      style={{ animationDelay: `${120 + index * 50}ms` }}
      className="flex animate-guf-rise flex-col gap-2.5 rounded-lg border border-border bg-surface px-4 pt-3 pb-3.5 shadow-e1"
    >
      {onOpen ? (
        <button
          type="button"
          onClick={() => onOpen(exercise.exerciseId)}
          aria-label={`${exercise.name}${group ? `, ${group}` : ""}. Ver evolução do exercício`}
          className="-mx-2 flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-md bg-transparent px-2 py-1 text-left text-fg transition-colors duration-150 ease-standard hover:bg-surface-3 active:scale-[.98] motion-reduce:active:scale-100"
        >
          <ExerciseHeading exercise={exercise} group={group} unit={unit} />
          <span className="flex items-center gap-1 text-accent-text">
            <Icon icon={TrendingUp} size={16} />
            <Icon icon={ChevronRight} size={16} className="text-fg-muted" />
          </span>
        </button>
      ) : (
        <div className="flex min-h-[52px] items-center py-1">
          <ExerciseHeading exercise={exercise} group={group} unit={unit} />
        </div>
      )}

      <div role="list" aria-label="Séries concluídas" className="flex flex-col gap-0.5">
        {exercise.sets.map((set, i) => {
          const meta = SET_TYPE_META[set.setType];
          const typed = set.setType !== "normal";
          const mark = marks[i] ?? "";
          const load = `${formatNumber(toDisplayWeight(set.weightKg, unit) ?? 0)} ${unit}`;
          const value = `${load} ${TIMES_SIGN} ${set.reps ?? 0}`;
          return (
            <div
              key={i}
              role="listitem"
              aria-label={`${typed ? meta.label : `Série ${mark}`}, ${load}, ${set.reps ?? 0} repetições${set.isRecord ? ", recorde pessoal" : ""}`}
              className={cn("-mx-1.5 grid min-h-9 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-1.5", set.isRecord && "bg-pr/10")}
            >
              <span aria-hidden="true" className={cn("grid size-7 place-items-center rounded-[8px] font-display text-base font-bold", meta.tint, meta.text)}>
                {mark}
              </span>
              <span
                aria-hidden="true"
                className={cn("font-display text-xl leading-6 font-semibold tabular-nums", set.setType === "warmup" ? "text-fg-secondary" : "text-fg")}
              >
                {value}
              </span>
              <span aria-hidden="true" className="flex items-center gap-2">
                {typed && <span className={cn("text-xs font-semibold", meta.text)}>{meta.label}</span>}
                {set.isRecord && <PRBadge animate />}
              </span>
            </div>
          );
        })}
      </div>

      {exercise.note && (
        <div className="flex items-start gap-2 rounded-[10px] bg-surface-3 px-3 py-2.5 text-[13px] leading-[18px] text-fg-secondary">
          <Icon icon={NotepadText} size={15} className="mt-0.5 text-fg-muted" />
          <span>
            <span className="sr-only">Observação: </span>
            {exercise.note}
          </span>
        </div>
      )}
    </article>
  );
}

function ExerciseHeading({ exercise, group, unit }: { exercise: SummaryExercise; group: string; unit: WeightUnit }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-base leading-[21px] font-semibold">{exercise.name}</span>
      <span className="flex flex-wrap items-center gap-2">
        {group && <Tag size="sm">{group}</Tag>}
        <span className="text-[13px] text-fg-muted tabular-nums">
          {plural(exercise.setCount, "série", "séries")} · {formatNumber(toDisplayWeight(exercise.volumeKg, unit) ?? 0, 0)} {unit}
        </span>
      </span>
    </span>
  );
}
