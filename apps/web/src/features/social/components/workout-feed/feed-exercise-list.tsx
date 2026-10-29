import { ChevronRight, Trophy } from "lucide-react";
import { feedBestSetLabel, FEED_VISIBLE_EXERCISES, plural, type WeightUnit, type WorkoutFeedExercise } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { FEED_SIZES } from "./feed-layout";

/** Melhor série do exercício; recorde ganha o selo dourado com troféu. */
function BestSet({ exercise, unit }: { exercise: WorkoutFeedExercise; unit: WeightUnit }) {
  const label = feedBestSetLabel(exercise, unit);
  if (!exercise.isRecord) return <span className="font-display text-[13px] font-semibold text-fg tabular-nums">{label}</span>;
  return (
    <span className="flex h-[22px] flex-none items-center gap-[3px] rounded-[8px] bg-pr/16 px-[7px] font-display text-[13px] font-semibold whitespace-nowrap text-pr-text tabular-nums">
      <Icon icon={Trophy} size={11} label="Recorde" />
      {label}
    </span>
  );
}

/**
 * Os primeiros exercícios do treino (séries e melhor série) em linhas de altura fixa e a linha
 * "+N exercícios · Ver mais", reservada mesmo vazia (a lista não muda de tamanho pelo conteúdo).
 */
export function FeedExerciseList({ exercises, unit }: { exercises: readonly WorkoutFeedExercise[]; unit: WeightUnit }) {
  const hidden = exercises.length - FEED_VISIBLE_EXERCISES;
  return (
    <div className="flex min-w-0 flex-col">
      {exercises.slice(0, FEED_VISIBLE_EXERCISES).map((exercise, i) => (
        <div key={`${exercise.name}-${i}`} className={cn("flex flex-none flex-col justify-center gap-px overflow-hidden border-b border-border", FEED_SIZES.exerciseRow)}>
          <span className="truncate text-xs leading-4 font-semibold">{exercise.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] leading-[14px] whitespace-nowrap text-fg-muted">
            <span className="flex-none">{plural(exercise.sets, "série", "séries")}</span>
            <span aria-hidden="true">·</span>
            <BestSet exercise={exercise} unit={unit} />
          </span>
        </div>
      ))}
      <span className={cn("flex flex-none items-center gap-1 text-xs font-semibold text-accent-text", FEED_SIZES.moreRow)}>
        {hidden > 0 && (
          <>
            +{plural(hidden, "exercício", "exercícios")} · Ver mais
            <Icon icon={ChevronRight} size={13} />
          </>
        )}
      </span>
    </div>
  );
}
