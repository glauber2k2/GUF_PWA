import type { ActiveWorkout, SummaryExercise, WorkoutExercise, WorkoutSet, WorkoutSummaryDetail, WorkoutSummaryRecord } from "@guf/api";
import { buildExerciseRecord, durationSeconds, estimate1RM, pauseStats, pickSetValues, sessionTotals, workoutElapsedSeconds, type RecordValue } from "@guf/core";
import { offlineDb } from "./db";
import { isClosedLocally } from "./outbox";

/**
 * Resumo de um treino finalizado SEM INTERNET e ainda não enviado: calculado no aparelho a partir do
 * retrato salvo do treino, com as mesmas regras do servidor (só séries concluídas, sem aquecimento;
 * recorde = 1RM acima do melhor anterior (no cardio, ritmo ou distância); primeira vez não conta). null = não há retrato pendente.
 */
export async function pendingWorkoutSummary(sessionId: string): Promise<WorkoutSummaryDetail | null> {
  if (!(await isClosedLocally(sessionId))) return null;
  const cached = await offlineDb().workouts.get(sessionId);
  if (!cached) return null;
  return summaryFromWorkout(cached.workout, new Date(cached.updatedAt));
}

/** No aparelho só se conhece a marca anterior (best1RmKg/cardioBest), não o dia em que foi feita. */
function toSummaryRecord(e: WorkoutExercise, record: RecordValue, recordSet: WorkoutSet | undefined): WorkoutSummaryRecord {
  const base = { exerciseId: e.exerciseId, exerciseName: e.name, previousOn: null };
  if (record.metric === "cardio") return { ...base, metric: "cardio", cardio: record.cardio };
  return {
    ...base,
    ...record,
    oneRmKg: estimate1RM(recordSet?.weightKg ?? null, recordSet?.reps ?? null) ?? 0,
    previous1RmKg: e.best1RmKg,
  };
}

export function summaryFromWorkout(w: ActiveWorkout, finishedAt: Date): WorkoutSummaryDetail {
  const records: WorkoutSummaryRecord[] = [];
  const exercises = w.exercises.flatMap<SummaryExercise>((e) => {
    const done = e.sets.filter((s) => s.isCompleted);
    if (done.length === 0) return [];
    const built = buildExerciseRecord(e, done);
    const recordIndex = built?.setIndex ?? -1;
    if (built) records.push(toSummaryRecord(e, built.record, done[recordIndex]));
    const totals = sessionTotals(done);
    return [
      {
        id: e.id,
        exerciseId: e.exerciseId,
        name: e.name,
        muscleGroup: e.muscleGroup,
        note: e.note,
        sets: done.map((s, i) => ({ setNumber: s.setNumber, setType: s.setType, ...pickSetValues(s), isRecord: i === recordIndex })),
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
