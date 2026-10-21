import { recordSetIndex, sessionTotals, type SetType } from "@guf/core";
import type { SummaryExercise, WorkoutSummaryRecord } from "./evolution";
import { toSetValues } from "./workout";

/* =====================================================================
 * Montagem do resumo de um treino (interno do pacote, fora do index):
 * o mesmo formato para o seu treino (getWorkoutSummary) e o de outra pessoa (getMemberWorkout).
 * ===================================================================== */

/** Série concluída como vem do banco. */
export interface CompletedSetRow {
  set_number: number;
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  /** Cardio (ausente em respostas de antes das colunas de cardio). */
  distance_km?: number | null;
  duration_seconds?: number | null;
}

/** Exercício do treino com as séries concluídas, na ordem. */
export interface SummaryExerciseInput {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  note: string | null;
  sets: readonly CompletedSetRow[];
}

/** Melhor 1RM antes do treino e o dia em que foi feito (null = primeira vez). */
export type PreviousBest = { oneRmKg: number; performedOn: string } | null;

const toPerformed = (l: CompletedSetRow) => ({ setType: l.set_type as SetType, ...toSetValues(l) });

/**
 * Exercício do resumo com totais e a série do recorde marcada.
 * @param record1RmKg 1RM do recorde batido neste treino (null = sem recorde).
 */
export function buildSummaryExercise(input: SummaryExerciseInput, record1RmKg: number | null): SummaryExercise {
  const performed = input.sets.map(toPerformed);
  const recordIndex = recordSetIndex(performed, record1RmKg);
  const totals = sessionTotals(performed.map((s) => ({ ...s, isCompleted: true })));
  return {
    id: input.id,
    exerciseId: input.exerciseId,
    name: input.name,
    muscleGroup: input.muscleGroup,
    note: input.note,
    sets: input.sets.map((l, i) => ({ setNumber: l.set_number, ...toPerformed(l), isRecord: i === recordIndex })),
    setCount: totals.setCount,
    volumeKg: totals.volumeKg,
  };
}

/**
 * Recorde do exercício a partir da série marcada.
 * @returns null quando o exercício não bateu recorde.
 */
export function buildSummaryRecord(exercise: SummaryExercise, record1RmKg: number | null, previous: PreviousBest): WorkoutSummaryRecord | null {
  const recordSet = exercise.sets.find((s) => s.isRecord);
  if (record1RmKg === null || !recordSet) return null;
  return {
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.name,
    weightKg: recordSet.weightKg ?? 0,
    reps: recordSet.reps ?? null,
    oneRmKg: record1RmKg,
    previous1RmKg: previous?.oneRmKg ?? null,
    previousOn: previous?.performedOn ?? null,
  };
}

/** Volume e séries do treino; recalcula sobre todas as séries (somar os volumes já arredondados de cada exercício acumularia erro de ponto flutuante). */
export function buildSummaryTotals(exercises: readonly SummaryExercise[]): { volumeKg: number; setCount: number } {
  return sessionTotals(exercises.flatMap((e) => e.sets.map((s) => ({ setType: s.setType, weightKg: s.weightKg, reps: s.reps, isCompleted: true }))));
}
