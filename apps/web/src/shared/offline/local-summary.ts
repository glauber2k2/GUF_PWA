import type { ActiveWorkout, SummaryExercise, WorkoutSummaryDetail, WorkoutSummaryRecord } from "@guf/api";
import { durationSeconds, estimate1RM, markRecordSets, pauseStats, sessionTotals, workoutElapsedSeconds } from "@guf/core";
import { offlineDb } from "./db";
import { isClosedLocally } from "./outbox";

/**
 * Resumo de um treino finalizado SEM INTERNET e ainda não enviado: calculado no aparelho a partir do
 * retrato salvo do treino, com as mesmas regras do servidor (só séries concluídas, sem aquecimento;
 * recorde = carga acima da melhor anterior; primeira vez não conta). null = não há retrato pendente.
 */
export async function pendingWorkoutSummary(sessionId: string): Promise<WorkoutSummaryDetail | null> {
  if (!(await isClosedLocally(sessionId))) return null;
  const cached = await offlineDb().workouts.get(sessionId);
  if (!cached) return null;
  return summaryFromWorkout(cached.workout, new Date(cached.updatedAt));
}

export function summaryFromWorkout(w: ActiveWorkout, finishedAt: Date): WorkoutSummaryDetail {
  const records: WorkoutSummaryRecord[] = [];
  const exercises = w.exercises.flatMap<SummaryExercise>((e) => {
    const done = e.sets.filter((s) => s.isCompleted);
    if (done.length === 0) return [];
    const recordIndex = markRecordSets(done, e.best1RmKg).indexOf(true);
    const recordSet = done[recordIndex];
    const record1RmKg = recordSet ? estimate1RM(recordSet.weightKg, recordSet.reps) : null;
    // No aparelho só se conhece o recorde anterior (best1RmKg), não o dia em que foi feito.
    if (recordSet && record1RmKg !== null)
      records.push({
        exerciseId: e.exerciseId,
        exerciseName: e.name,
        weightKg: recordSet.weightKg ?? 0,
        reps: recordSet.reps,
        oneRmKg: record1RmKg,
        previous1RmKg: e.best1RmKg,
        previousOn: null,
      });
    const totals = sessionTotals(done);
    return [
      {
        id: e.id,
        exerciseId: e.exerciseId,
        name: e.name,
        muscleGroup: e.muscleGroup,
        note: e.note,
        sets: done.map((s, i) => ({ setNumber: s.setNumber, setType: s.setType, weightKg: s.weightKg, reps: s.reps, isRecord: i === recordIndex })),
        setCount: totals.setCount,
        volumeKg: totals.volumeKg,
      },
    ];
  });
  const totals = sessionTotals(w.exercises.flatMap((e) => e.sets));
  const clock = { startedAt: w.startedAt, periods: w.activePeriods };
  const active = workoutElapsedSeconds(clock, finishedAt);
  return {
    id: w.id,
    name: w.name,
    projectName: w.projectName,
    routineId: w.routineId,
    performedOn: w.performedOn,
    startedAt: w.startedAt,
    editedAt: null,
    finishedAt: finishedAt.toISOString(),
    durationSeconds: active,
    ...pauseStats(w.activePeriods.length, durationSeconds(w.startedAt, finishedAt.toISOString()), active),
    volumeKg: totals.volumeKg,
    setCount: totals.setCount,
    exercises,
    records,
    // Ainda não enviado: os outros treinos do dia estão no servidor; aqui mostra só este.
    daySessionIds: [w.id],
    weightUnit: w.weightUnit,
  };
}
