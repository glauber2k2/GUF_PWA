import { ChevronRight, Trophy } from "lucide-react";
import { feedBestSetLabel, FEED_VISIBLE_EXERCISES, plural, type WeightUnit, type WorkoutFeedExercise } from "@guf/core";
import { Icon } from "@/shared/components/ds";

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

/** Os primeiros exercícios do treino (séries e melhor série) e "+N exercícios · Ver mais". */
export function FeedExerciseList({ exercises, unit }: { exercises: readonly WorkoutFeedExercise[]; unit: WeightUnit }) {
  const hidden = exercises.length - FEED_VISIBLE_EXERCISES;
  return (
    <div className="flex min-w-0 flex-col">
      {exercises.slice(0, FEED_VISIBLE_EXERCISES).map((exercise, i) => (
        <div key={`${exercise.name}-${i}`} className="flex flex-col gap-px border-b border-border py-1">
          <span className="truncate text-xs leading-4 font-semibold">{exercise.name}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] leading-[14px] text-fg-muted">
            <span className="flex-none">{plural(exercise.sets, "série", "séries")}</span>
            <span aria-hidden="true">·</span>
            <BestSet exercise={exercise} unit={unit} />
          </span>
        </div>
      ))}
      {hidden > 0 && (
        <span className="flex h-[26px] items-center gap-1 text-xs font-semibold text-accent-text">
          +{plural(hidden, "exercício", "exercícios")} · Ver mais
          <Icon icon={ChevronRight} size={13} />
        </span>
      )}
    </div>
  );
}
