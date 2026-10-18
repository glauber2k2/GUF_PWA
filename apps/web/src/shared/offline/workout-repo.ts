import {
  apiError,
  getExerciseLibrary,
  getWorkout,
  isNetworkError,
  type ActiveWorkout,
  type ApiResult,
  type LibraryExercise,
} from "@guf/api";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { offlineDb } from "./db";
import { flushOutbox, hasPendingFor } from "./outbox";

/** Origem dos dados carregados: servidor ou retrato salvo no aparelho. */
export type DataSource = "network" | "device";

/**
 * Carrega o treino (offline-first):
 * - com gravações pendentes, o retrato do aparelho é o mais atual → usa ele e envia a fila;
 * - senão busca no servidor e atualiza o retrato;
 * - sem conexão, usa o retrato do aparelho (se houver).
 */
export async function loadWorkout(sessionId: string): Promise<ApiResult<{ workout: ActiveWorkout; source: DataSource }>> {
  const db = offlineDb();
  const cached = await db.workouts.get(sessionId);
  if (cached && (await hasPendingFor(sessionId))) {
    void flushOutbox();
    return { data: { workout: cached.workout, source: "device" }, error: null };
  }
  const res = await getWorkout(getSupabaseClient(), { sessionId });
  if (res.data) {
    await db.workouts.put({ sessionId, workout: res.data, updatedAt: Date.now() });
    return { data: { workout: res.data, source: "network" }, error: null };
  }
  if (res.error.code === "workout_not_found") {
    await db.workouts.delete(sessionId);
    return { data: null, error: res.error };
  }
  if (cached && isNetworkError(res.error)) return { data: { workout: cached.workout, source: "device" }, error: null };
  return { data: null, error: res.error ?? apiError("unknown") };
}

/** Salva o retrato atual do treino no aparelho (a cada alteração). */
export async function saveWorkoutSnapshot(workout: ActiveWorkout): Promise<void> {
  await offlineDb().workouts.put({ sessionId: workout.id, workout, updatedAt: Date.now() });
}

export async function removeWorkoutSnapshot(sessionId: string): Promise<void> {
  await offlineDb().workouts.delete(sessionId);
}

/** Biblioteca de exercícios: servidor (atualiza o aparelho) ou, sem conexão, a do aparelho. */
export async function loadExerciseLibrary(): Promise<ApiResult<LibraryExercise[]>> {
  const db = offlineDb();
  const res = await getExerciseLibrary(getSupabaseClient());
  if (res.data) {
    await db.library.put({ key: "all", items: res.data, updatedAt: Date.now() });
    return res;
  }
  const cached = await db.library.get("all");
  if (cached && isNetworkError(res.error)) return { data: cached.items, error: null };
  return res;
}

/** Acrescenta à biblioteca do aparelho um exercício criado localmente. */
export async function addToLibraryCache(exercise: LibraryExercise): Promise<void> {
  const db = offlineDb();
  const cached = await db.library.get("all");
  await db.library.put({ key: "all", items: [...(cached?.items ?? []), exercise], updatedAt: Date.now() });
}
