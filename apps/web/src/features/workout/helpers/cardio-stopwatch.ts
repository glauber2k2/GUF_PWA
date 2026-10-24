import type { CardioStopwatchRun } from "@/features/workout/hooks/use-cardio-stopwatch";
import type { ExerciseView } from "./workout-state";

/** O cronômetro conta para um exercício que não está mais no treino (removido ou trocado). */
export function isStopwatchOrphan(exercises: readonly ExerciseView[], running: CardioStopwatchRun | null): boolean {
  if (!running) return false;
  return !exercises.some((e) => e.id === running.exerciseId);
}
