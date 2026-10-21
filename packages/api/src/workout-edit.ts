import { previousBest1Rm, type WeightUnit } from "@guf/core";
import type { GufClient } from "./client";
import { exerciseHistories } from "./history";
import { apiError, toApiError, type ApiResult } from "./result";
import { FREE_WORKOUT_NAME, sessionDurationSeconds, toWeightUnit } from "./shared";
import { DEFAULT_REST_SECONDS, type NewWorkoutExercise, type WorkoutExercise } from "./workout";

/* =====================================================================
 * Contrato — Editar um treino concluído (resumo → "Editar treino")
 * Só online: a edição é gravada de uma vez por save_workout_edit (sem fila offline).
 * apps/web/src/mocks/workout-edit.ts implementa o mesmo contrato (`satisfies WorkoutEditApi`).
 * ===================================================================== */

/** Treino concluído no formato da tela de treino, para editar. */
export interface EditableWorkout {
  id: string;
  name: string;
  performedOn: string;
  /** Tempo efetivo atual (sem pausas), o que a pessoa pode corrigir. */
  activeSeconds: number;
  note: string | null;
  /** Unidade de exibição do usuário (o banco guarda kg). */
  weightUnit: WeightUnit;
  /**
   * Exercícios com as séries concluídas. `best1RmKg` = melhor 1RM ANTES deste treino (marca os
   * recordes como no resumo); `previous` vem vazio (o "anterior" é do treino em andamento).
   */
  exercises: WorkoutExercise[];
}

/** Exercício editado: o de gravação do treino mais a observação. */
export interface EditedWorkoutExercise extends NewWorkoutExercise {
  note: string | null;
}

export interface WorkoutEditInput {
  sessionId: string;
  /** Tempo efetivo corrigido (1 min a 24 h). */
  activeSeconds: number;
  note: string | null;
  /** Ordem final; séries não concluídas e exercícios sem séries saem do treino. */
  exercises: EditedWorkoutExercise[];
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface WorkoutEditApi {
  getEditableWorkout: (client: GufClient, input: { sessionId: string }) => Result<EditableWorkout>;
  saveWorkoutEdit: (client: GufClient, input: WorkoutEditInput) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const asSetType = (value: string) => (value === "warmup" || value === "dropset" || value === "failure" ? value : "normal");

/** Treinos concluídos do mesmo dia que terminaram antes deste (contam como anteriores nos recordes). */
async function fetchEarlierSameDay(client: GufClient, sessionId: string, performedOn: string): Promise<ApiResult<Set<string>>> {
  const { data, error } = await client
    .from("workout_sessions")
    .select("id")
    .eq("status", "completed")
    .eq("performed_on", performedOn)
    .order("finished_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { data: null, error: toApiError(error) };
  const ids = data.map((r) => r.id);
  return { data: new Set(ids.slice(0, Math.max(0, ids.indexOf(sessionId)))), error: null };
}

export const getEditableWorkout: WorkoutEditApi["getEditableWorkout"] = async (client, { sessionId }) => {
  try {
    const [sessionRes, profileRes] = await Promise.all([
      client
        .from("workout_sessions")
        .select(
          "id, name, status, routine_id, performed_on, started_at, finished_at, active_seconds, notes, session_exercises(id, exercise_id, position, notes, exercises(name, muscle_group, equipment), set_logs(id, set_number, set_type, weight_kg, reps, is_completed))",
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

    const exerciseIds = [...new Set(s.session_exercises.map((se) => se.exercise_id))];
    const [earlierRes, histories, routineRes] = await Promise.all([
      fetchEarlierSameDay(client, s.id, s.performed_on),
      exerciseHistories(client, exerciseIds),
      s.routine_id
        ? client.from("routine_exercises").select("exercise_id, rest_seconds").eq("routine_id", s.routine_id)
        : Promise.resolve({ data: [] as { exercise_id: string; rest_seconds: number | null }[], error: null }),
    ]);
    if (earlierRes.error) return { data: null, error: earlierRes.error };
    if (histories.error) return { data: null, error: histories.error };
    if (routineRes.error) return { data: null, error: toApiError(routineRes.error) };

    const exercises = s.session_exercises
      .map<WorkoutExercise>((se) => {
        const history = histories.data.get(se.exercise_id) ?? [];
        return {
          id: se.id,
          exerciseId: se.exercise_id,
          name: se.exercises?.name ?? "Exercício",
          muscleGroup: se.exercises?.muscle_group ?? "",
          equipment: se.exercises?.equipment ?? "outro",
          restSeconds: routineRes.data?.find((r) => r.exercise_id === se.exercise_id)?.rest_seconds ?? DEFAULT_REST_SECONDS,
          note: se.notes,
          best1RmKg: previousBest1Rm(history, s.id, s.performed_on, earlierRes.data)?.oneRmKg ?? null,
          sets: se.set_logs
            .filter((l) => l.is_completed)
            .map((l) => ({
              id: l.id,
              setNumber: l.set_number,
              setType: asSetType(l.set_type),
              weightKg: l.weight_kg,
              reps: l.reps,
              isCompleted: true,
              previous: null,
            })),
        };
      })
      .filter((e) => e.sets.length > 0);

    return {
      data: {
        id: s.id,
        name: s.name ?? FREE_WORKOUT_NAME,
        performedOn: s.performed_on,
        activeSeconds: sessionDurationSeconds(s),
        note: s.notes,
        weightUnit: toWeightUnit(profileRes.data?.weight_unit),
        exercises,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const saveWorkoutEdit: WorkoutEditApi["saveWorkoutEdit"] = async (client, { sessionId, activeSeconds, note, exercises }) => {
  try {
    const { error } = await client.rpc("save_workout_edit", {
      p_session_id: sessionId,
      p_active_seconds: Math.round(activeSeconds),
      p_note: note ?? "",
      p_exercises: exercises.map((e) => ({
        id: e.id,
        exercise_id: e.exerciseId,
        position: e.position,
        note: e.note ?? "",
        // Só as concluídas ficam (mesma regra do finish_workout).
        sets: e.sets
          .filter((set) => set.isCompleted)
          .map((set, index) => ({ id: set.id, set_number: index + 1, set_type: set.setType, weight_kg: set.weightKg, reps: set.reps })),
      })),
    });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/** Garante em tempo de compilação que a implementação segue o contrato. */
export const workoutEditApi = { getEditableWorkout, saveWorkoutEdit } satisfies WorkoutEditApi;
