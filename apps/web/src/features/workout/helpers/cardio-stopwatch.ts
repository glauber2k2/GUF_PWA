import type { CardioStopwatchRun } from "@/features/workout/hooks/use-cardio-stopwatch";
import type { ExerciseView } from "./workout-state";

export interface StopwatchTarget {
  setId: string;
  /** Posição da série no exercício (1, 2…), para o rótulo "Série 1". */
  setNumber: number;
  /** O cronômetro está contando nesta série agora. */
  isRunningHere: boolean;
}

/**
 * Série do cardio que o cronômetro usa: a que está contando ou, parado, a primeira ainda não
 * concluída. null = todas concluídas (nada a cronometrar).
 */
export function stopwatchTarget(exercise: ExerciseView, running: CardioStopwatchRun | null): StopwatchTarget | null {
  const runningSet = running?.exerciseId === exercise.id ? exercise.sets.find((s) => s.id === running.setId) : undefined;
  if (runningSet) return { setId: runningSet.id, setNumber: exercise.sets.indexOf(runningSet) + 1, isRunningHere: true };
  const nextIndex = exercise.sets.findIndex((s) => !s.isCompleted);
  const next = exercise.sets[nextIndex];
  return next ? { setId: next.id, setNumber: nextIndex + 1, isRunningHere: false } : null;
}

/** O cronômetro aponta para uma série que não existe mais (removida ou exercício trocado). */
export function isStopwatchOrphan(exercises: readonly ExerciseView[], running: CardioStopwatchRun | null): boolean {
  if (!running) return false;
  return !exercises.some((e) => e.id === running.exerciseId && e.sets.some((s) => s.id === running.setId));
}
