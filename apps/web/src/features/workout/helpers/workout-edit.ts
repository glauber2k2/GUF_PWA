import type { WorkoutEditInput } from "@guf/api";
import { toNewWorkoutExercise } from "./workout-builders";
import type { WorkoutViewState } from "./workout-state";

/** Edição de um treino concluído no formato de gravação (ordem da tela = position). */
export function toWorkoutEditInput(sessionId: string, activeSeconds: number, state: WorkoutViewState): WorkoutEditInput {
  return {
    sessionId,
    activeSeconds,
    note: state.note,
    exercises: state.exercises.map((e, i) => ({ ...toNewWorkoutExercise(e, i), note: e.note })),
  };
}

/** Mudou algo em relação ao que veio do servidor (tempo, observações, exercícios ou séries)? */
export function hasWorkoutEditChanges(initial: WorkoutEditInput, current: WorkoutEditInput): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}
