"use client";

import type { ReactNode } from "react";
import type { SetMetricKind } from "@guf/core";
import { CardioExerciseCard } from "@/features/workout/components/cardio/cardio-exercise-card";
import type { ExerciseCardFrameProps } from "@/features/workout/components/exercise-card-shell";
import { WorkoutExerciseCard } from "@/features/workout/components/workout-exercise-card";
import type { ExerciseView } from "@/features/workout/helpers/workout-state";
import type { CardioTimerControls } from "@/features/workout/hooks/use-cardio-timer-controls";
import type { WorkoutEditing } from "@/features/workout/hooks/use-workout-editing";

/** Tudo o que a lista sabe de um exercício; cada tipo de card usa a parte que precisa. */
export interface ExerciseCardContext {
  exercise: ExerciseView;
  exerciseIndex: number;
  frame: ExerciseCardFrameProps;
  editing: WorkoutEditing;
  cardioTimerFor: (exerciseId: string) => CardioTimerControls | undefined;
}

/**
 * Card de cada tipo de medida (packages/core/src/set-metrics.ts). Tipo novo = uma entrada aqui;
 * a lista (WorkoutEditor) não muda.
 */
export const EXERCISE_CARD_RENDERERS: Record<SetMetricKind, (context: ExerciseCardContext) => ReactNode> = {
  strength: ({ exercise: ex, exerciseIndex, frame, editing }) => (
    <WorkoutExerciseCard
      {...frame}
      exercise={ex}
      unit={editing.unit}
      poppedKey={editing.popped}
      editing={editing.edit?.exerciseId === ex.id ? { setIndex: editing.edit.setIndex, field: editing.edit.field } : null}
      onOpenNote={() => editing.openNote(ex.id)}
      onAddSet={() => editing.addSet(ex)}
      onToggleSet={(setIndex) => editing.toggleSet(exerciseIndex, setIndex)}
      onCycleType={(setIndex) => editing.cycleType(ex, setIndex)}
      onEditField={(setIndex, field) => editing.startEdit({ exerciseId: ex.id, setIndex, field })}
      onRemoveSet={(setIndex) => editing.removeSet(ex, setIndex)}
    />
  ),
  cardio: ({ exercise: ex, frame, editing, cardioTimerFor }) => (
    <CardioExerciseCard
      {...frame}
      exercise={ex}
      timer={cardioTimerFor(ex.id)}
      onLogSet={(entry) => editing.logCardioSet(ex.id, entry)}
      onSaveDistance={(setId, distanceKm) => editing.setDistance(ex.id, setId, distanceKm)}
      onRemoveSet={(setIndex) => editing.removeSet(ex, setIndex)}
    />
  ),
};
