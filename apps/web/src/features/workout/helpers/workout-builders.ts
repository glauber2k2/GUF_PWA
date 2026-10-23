import type { ActiveWorkout, ExerciseContext, FinishedWorkoutSummary, LibraryExercise, NewWorkoutExercise, WorkoutExercise, WorkoutSet } from "@guf/api";
import { DEFAULT_REST_SECONDS } from "@guf/api";
import {
  EMPTY_SET_VALUES,
  markRecordSets,
  pauseCount,
  pickSetValues,
  sessionTotals,
  measuresReps,
  setMetricFor,
  workoutElapsedSeconds,
  type SetType,
  type WorkoutClock,
} from "@guf/core";
import type { WorkoutViewState } from "./workout-state";

/* Montagem de exercícios/séries com ids gerados no aparelho (funciona offline). */


function previousFor(context: ExerciseContext | undefined, setNumber: number) {
  const prev = context?.previous.find((p) => p.setNumber === setNumber);
  return prev ? pickSetValues(prev) : null;
}

/**
 * Exercício novo no treino: séries do último desempenho (medidas preenchidas: carga/reps ou
 * distância/tempo) ou, sem histórico/sem internet, as séries vazias do tipo (força 3, cardio 1). `template` (troca) mantém nº e tipos das séries.
 */
export function buildWorkoutExercise(
  library: LibraryExercise,
  context: ExerciseContext | undefined,
  template?: Pick<WorkoutSet, "setType" | "reps">[],
): WorkoutExercise {
  const total = template?.length || context?.previous.length || setMetricFor(library.muscleGroup).defaultSetCount;
  // Na troca, as repetições do exercício antigo só servem se o novo também mede repetições (não no cardio).
  const keepsTemplateReps = measuresReps(library.muscleGroup);
  return {
    id: crypto.randomUUID(),
    exerciseId: library.id,
    name: library.name,
    muscleGroup: library.muscleGroup,
    equipment: library.equipment,
    restSeconds: context?.restSeconds ?? DEFAULT_REST_SECONDS,
    note: context?.routineNote ?? null,
    best1RmKg: context?.best1RmKg ?? null,
    sets: Array.from({ length: total }, (_, i) => {
      const prev = previousFor(context, i + 1);
      return {
        id: crypto.randomUUID(),
        setNumber: i + 1,
        setType: (template?.[i]?.setType ?? "normal") as SetType,
        ...(prev ?? EMPTY_SET_VALUES),
        reps: prev?.reps ?? (keepsTemplateReps ? template?.[i]?.reps : null) ?? null,
        isCompleted: false,
        previous: prev,
      };
    }),
  };
}

/** Exercício no formato de gravação (fila/banco). */
export function toNewWorkoutExercise(exercise: WorkoutExercise, position: number): NewWorkoutExercise {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    position,
    sets: exercise.sets.map((s) => ({
      id: s.id,
      setNumber: s.setNumber,
      setType: s.setType,
      ...pickSetValues(s),
      isCompleted: s.isCompleted,
    })),
  };
}

/** Retrato do treino (base + alterações locais + relógio) para salvar no aparelho. */
export function workoutSnapshot(base: ActiveWorkout, state: WorkoutViewState, clock: WorkoutClock): ActiveWorkout {
  return {
    ...base,
    note: state.note,
    activePeriods: clock.periods,
    // Remove os campos de tela (open/flash).
    exercises: state.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      name: e.name,
      muscleGroup: e.muscleGroup,
      equipment: e.equipment,
      restSeconds: e.restSeconds,
      note: e.note,
      best1RmKg: e.best1RmKg,
      sets: e.sets,
    })),
  };
}

/**
 * Resumo calculado no aparelho (finalizado sem internet): mesmas regras do finish_workout —
 * séries não concluídas não contam, aquecimento fora do volume, tempo efetivo pelos períodos.
 */
export function localSummary(state: WorkoutViewState, clock: WorkoutClock, now = new Date()): FinishedWorkoutSummary {
  const done = state.exercises.flatMap((e) => e.sets.filter((s) => s.isCompleted));
  const totals = sessionTotals(done);
  const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(clock.startedAt).getTime()) / 1000));
  return {
    durationSeconds: workoutElapsedSeconds(clock, now),
    elapsedSeconds: elapsed,
    pauseCount: pauseCount(clock),
    volumeKg: totals.volumeKg,
    setCount: totals.setCount,
    personalRecords: state.exercises.flatMap((e) => {
      const flags = markRecordSets(e.sets, e.best1RmKg);
      return e.sets
        .filter((_, i) => flags[i])
        .map((s) => ({ exerciseName: e.name, weightKg: s.weightKg ?? 0, reps: s.reps ?? 0 }));
    }),
  };
}
