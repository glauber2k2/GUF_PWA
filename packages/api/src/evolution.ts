import {
  best1RMSet,
  bestLoadSet,
  durationSeconds,
  pauseStats,
  recordSetIndex,
  sessionLoadRecord,
  sessionTotals,
  withRecords,
  type ExerciseSessionEvolution,
  type ExerciseSessionPoint,
  type SetType,
  type WeightUnit,
} from "@guf/core";
import type { GufClient } from "./client";
import { exerciseHistories } from "./history";
import { apiError, toApiError, type ApiResult } from "./result";
import { FREE_WORKOUT_NAME, sessionDurationSeconds } from "./shared";

/* =====================================================================
 * Contrato — Resumo do treino e Evolução por exercício
 * Só séries concluídas; aquecimento não entra em volume, séries, 1RM nem recordes.
 * ===================================================================== */

export interface SummarySet {
  setNumber: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  /** Série que bateu o recorde de carga do exercício neste treino. */
  isRecord: boolean;
}

export interface SummaryExercise {
  /** id de session_exercises. */
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  note: string | null;
  /** Só séries concluídas, na ordem. */
  sets: SummarySet[];
  /** Séries concluídas sem aquecimento. */
  setCount: number;
  volumeKg: number;
}

export interface WorkoutSummaryRecord {
  exerciseId: string;
  exerciseName: string;
  weightKg: number;
  reps: number | null;
}

/** Treino concluído com tudo o que a tela de resumo mostra. */
export interface WorkoutSummaryDetail {
  id: string;
  name: string;
  /** Projeto da rotina; null = treino livre (ou rotina que não existe mais). */
  projectName: string | null;
  routineId: string | null;
  performedOn: string;
  startedAt: string;
  finishedAt: string | null;
  /** Tempo efetivo (sem pausas). */
  durationSeconds: number;
  pauseCount: number;
  pausedSeconds: number;
  volumeKg: number;
  setCount: number;
  exercises: SummaryExercise[];
  records: WorkoutSummaryRecord[];
  /** Treinos concluídos do mesmo dia, do primeiro ao último a terminar (inclui este): "1/2", "2/2". */
  daySessionIds: string[];
  weightUnit: WeightUnit;
}

export interface ExerciseInfo {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
}

export interface ExerciseEvolution {
  exercise: ExerciseInfo;
  weightUnit: WeightUnit;
  /** Treinos concluídos com o exercício, do mais antigo ao mais recente, com os recordes marcados. */
  sessions: ExerciseSessionEvolution[];
}

/** Exercício já feito (busca "Ver evolução de um exercício"). */
export interface TrainedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  lastPerformedOn: string;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface EvolutionApi {
  getWorkoutSummary: (client: GufClient, input: { sessionId: string }) => Result<WorkoutSummaryDetail>;
  /** Exclui um treino CONCLUÍDO (séries, exercícios e pausas saem junto). O em andamento usa "Descartar". */
  deleteWorkout: (client: GufClient, input: { sessionId: string }) => Result;
  getExerciseEvolution: (client: GufClient, input: { exerciseId: string }) => Result<ExerciseEvolution>;
  listTrainedExercises: (client: GufClient) => Result<TrainedExercise[]>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

interface SetRow {
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
}

const toPerformed = (l: SetRow) => ({ setType: l.set_type as SetType, weightKg: l.weight_kg, reps: l.reps });
const toCompleted = (l: SetRow) => ({ ...toPerformed(l), isCompleted: true });

const toUnit = (value: string | null | undefined): WeightUnit => (value === "lb" ? "lb" : "kg");

export const getWorkoutSummary: EvolutionApi["getWorkoutSummary"] = async (client, { sessionId }) => {
  try {
    const [sessionRes, profileRes] = await Promise.all([
      client
        .from("workout_sessions")
        .select(
          "id, name, status, routine_id, performed_on, started_at, finished_at, active_seconds, routines(projects(name)), workout_active_periods(id), session_exercises(id, exercise_id, position, notes, exercises(name, muscle_group), set_logs(set_number, set_type, weight_kg, reps, is_completed))",
        )
        .eq("id", sessionId)
        .order("position", { referencedTable: "session_exercises", ascending: true })
        .order("set_number", { referencedTable: "session_exercises.set_logs", ascending: true })
        .maybeSingle(),
      client.from("profiles").select("weight_unit").maybeSingle(),
    ]);
    if (sessionRes.error) return { data: null, error: toApiError(sessionRes.error) };
    const s = sessionRes.data;
    if (!s || s.status !== "completed") return { data: null, error: apiError("session_not_found") };

    // Treinos concluídos do mesmo dia, em ordem de término: posição "1/2" na tela e recordes
    // (os que terminaram antes deste contam como anteriores, como no finish_workout).
    const dayRes = await client
      .from("workout_sessions")
      .select("id")
      .eq("status", "completed")
      .eq("performed_on", s.performed_on)
      .order("finished_at", { ascending: true })
      .order("id", { ascending: true });
    if (dayRes.error) return { data: null, error: toApiError(dayRes.error) };
    const daySessionIds = dayRes.data.map((r) => r.id);
    const earlierSameDay = new Set(daySessionIds.slice(0, Math.max(0, daySessionIds.indexOf(s.id))));

    const exerciseRows = s.session_exercises
      .map((se) => ({ se, sets: se.set_logs.filter((l) => l.is_completed) }))
      .filter(({ sets }) => sets.length > 0);
    const histories = await exerciseHistories(client, [...new Set(exerciseRows.map(({ se }) => se.exercise_id))]);
    if (histories.error) return { data: null, error: histories.error };

    const records: WorkoutSummaryRecord[] = [];
    const exercises = exerciseRows.map<SummaryExercise>(({ se, sets }) => {
      const name = se.exercises?.name ?? "Exercício";
      const performed = sets.map(toPerformed);
      const recordKg = sessionLoadRecord(histories.data.get(se.exercise_id) ?? [], s.id, s.performed_on, earlierSameDay);
      const recordIndex = recordSetIndex(performed, recordKg);
      if (recordKg !== null) records.push({ exerciseId: se.exercise_id, exerciseName: name, weightKg: recordKg, reps: performed[recordIndex ?? -1]?.reps ?? null });
      const totals = sessionTotals(sets.map(toCompleted));
      return {
        id: se.id,
        exerciseId: se.exercise_id,
        name,
        muscleGroup: se.exercises?.muscle_group ?? "",
        note: se.notes,
        sets: sets.map((l, i) => ({ setNumber: l.set_number, setType: l.set_type as SetType, weightKg: l.weight_kg, reps: l.reps, isRecord: i === recordIndex })),
        setCount: totals.setCount,
        volumeKg: totals.volumeKg,
      };
    });

    const totals = sessionTotals(exerciseRows.flatMap(({ sets }) => sets.map(toCompleted)));
    const duration = sessionDurationSeconds(s);
    const pauses = pauseStats(s.workout_active_periods.length, durationSeconds(s.started_at, s.finished_at), duration);
    return {
      data: {
        id: s.id,
        name: s.name ?? FREE_WORKOUT_NAME,
        projectName: s.routines?.projects?.name ?? null,
        routineId: s.routine_id,
        performedOn: s.performed_on,
        startedAt: s.started_at,
        finishedAt: s.finished_at,
        durationSeconds: duration,
        ...pauses,
        volumeKg: totals.volumeKg,
        setCount: totals.setCount,
        exercises,
        records,
        daySessionIds: daySessionIds.includes(s.id) ? daySessionIds : [s.id],
        weightUnit: toUnit(profileRes.data?.weight_unit),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const deleteWorkout: EvolutionApi["deleteWorkout"] = async (client, { sessionId }) => {
  try {
    const { data, error } = await client.from("workout_sessions").delete().eq("id", sessionId).eq("status", "completed").select("id");
    if (error) return { data: null, error: toApiError(error) };
    return data.length ? { data: null, error: null } : { data: null, error: apiError("session_not_found") };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getExerciseEvolution: EvolutionApi["getExerciseEvolution"] = async (client, { exerciseId }) => {
  try {
    const [exerciseRes, historyRes, setsRes, profileRes] = await Promise.all([
      client.from("exercises").select("id, name, muscle_group, equipment").eq("id", exerciseId).maybeSingle(),
      client.rpc("get_exercise_history", { p_exercise_id: exerciseId }),
      client
        .from("set_logs")
        .select("session_id, set_type, weight_kg, reps, workout_sessions!inner(name, finished_at, status)")
        .eq("exercise_id", exerciseId)
        .eq("is_completed", true)
        .eq("workout_sessions.status", "completed"),
      client.from("profiles").select("weight_unit").maybeSingle(),
    ]);
    const failed = [exerciseRes, historyRes, setsRes, profileRes].find((r) => r.error)?.error;
    if (failed) return { data: null, error: toApiError(failed) };
    const ex = exerciseRes.data;
    if (!ex) return { data: null, error: apiError("exercise_not_found") };

    // Séries de cada treino: repetições da melhor série e a série do melhor 1RM.
    const bySession = new Map<string, { name: string; finishedAt: string | null; sets: Array<{ setType: SetType; weightKg: number | null; reps: number | null }> }>();
    for (const row of setsRes.data ?? []) {
      const entry = bySession.get(row.session_id) ?? { name: row.workout_sessions.name ?? FREE_WORKOUT_NAME, finishedAt: row.workout_sessions.finished_at, sets: [] };
      entry.sets.push(toPerformed(row));
      bySession.set(row.session_id, entry);
    }

    // Números oficiais de cada treino: get_exercise_history (mesma regra do banco para carga, 1RM e volume).
    const points = (historyRes.data ?? []).map<ExerciseSessionPoint>((h) => {
      const entry = bySession.get(h.session_id);
      const sets = entry?.sets ?? [];
      const maxWeightKg = Number(h.max_weight_kg);
      const best = bestLoadSet(sets.filter((set) => set.weightKg === maxWeightKg));
      const oneRm = best1RMSet(sets);
      return {
        sessionId: h.session_id,
        performedOn: h.performed_on,
        finishedAt: entry?.finishedAt ?? null,
        sessionName: entry?.name ?? FREE_WORKOUT_NAME,
        maxWeightKg,
        repsAtMax: best?.reps ?? null,
        best1RMKg: h.best_e1rm_kg === null ? null : Number(h.best_e1rm_kg),
        best1RMSet: oneRm ? { weightKg: oneRm.weightKg, reps: oneRm.reps } : null,
        volumeKg: Number(h.total_volume_kg),
        setCount: h.total_sets,
      };
    });

    return {
      data: {
        exercise: { id: ex.id, name: ex.name, muscleGroup: ex.muscle_group, equipment: ex.equipment },
        weightUnit: toUnit(profileRes.data?.weight_unit),
        sessions: withRecords(points),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const listTrainedExercises: EvolutionApi["listTrainedExercises"] = async (client) => {
  try {
    const { data, error } = await client
      .from("session_exercises")
      .select("exercise_id, exercises(name, muscle_group), workout_sessions!inner(performed_on, status)")
      .eq("workout_sessions.status", "completed");
    if (error) return { data: null, error: toApiError(error) };
    const byExercise = new Map<string, TrainedExercise>();
    for (const row of data) {
      const current = byExercise.get(row.exercise_id);
      const performedOn = row.workout_sessions.performed_on;
      if (!current || performedOn > current.lastPerformedOn) {
        byExercise.set(row.exercise_id, {
          exerciseId: row.exercise_id,
          name: row.exercises?.name ?? "Exercício",
          muscleGroup: row.exercises?.muscle_group ?? "",
          lastPerformedOn: performedOn,
        });
      }
    }
    return { data: [...byExercise.values()], error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const evolutionApi = { getWorkoutSummary, deleteWorkout, getExerciseEvolution, listTrainedExercises } satisfies EvolutionApi;
