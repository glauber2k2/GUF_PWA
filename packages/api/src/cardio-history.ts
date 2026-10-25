import { cardioBestOf, mergeCardioBests, type CardioBest, type CardioRecordCandidate, type CardioSessionBest, type SetType } from "@guf/core";
import type { GufClient } from "./client";
import { toApiError, type ApiResult } from "./result";

/* =====================================================================
 * Histórico de cardio para os recordes (interno do pacote, fora do index).
 * O banco só conhece recorde de carga (1RM); o de cardio (ritmo/velocidade e distância) sai das
 * séries concluídas com distância, lidas pelo RLS (só as da própria pessoa).
 * ===================================================================== */

/**
 * Melhores marcas de cardio por treino concluído, de cada exercício.
 * @returns mapa exercício → treinos (sem treino com distância = lista vazia).
 */
export async function fetchCardioHistories(
  client: GufClient,
  exerciseIds: readonly string[],
): Promise<ApiResult<Map<string, CardioSessionBest[]>>> {
  const ids = [...new Set(exerciseIds)];
  const byExercise = new Map<string, CardioSessionBest[]>(ids.map((id) => [id, []]));
  if (ids.length === 0) return { data: byExercise, error: null };
  const { data, error } = await client
    .from("set_logs")
    .select("session_id, exercise_id, set_type, distance_km, duration_seconds, workout_sessions!inner(performed_on, status)")
    .in("exercise_id", ids)
    .eq("is_completed", true)
    .eq("workout_sessions.status", "completed")
    .not("distance_km", "is", null);
  if (error) return { data: null, error: toApiError(error) };

  const sessions = new Map<string, { exerciseId: string; performedOn: string; sets: CardioRecordCandidate[] }>();
  for (const row of data) {
    const key = `${row.exercise_id}:${row.session_id}`;
    const entry = sessions.get(key) ?? { exerciseId: row.exercise_id, performedOn: row.workout_sessions.performed_on, sets: [] };
    entry.sets.push({
      setType: row.set_type as SetType,
      isCompleted: true,
      distanceKm: row.distance_km === null ? null : Number(row.distance_km),
      durationSeconds: row.duration_seconds,
    });
    sessions.set(key, entry);
  }
  for (const [key, entry] of sessions) {
    const sessionId = key.slice(entry.exerciseId.length + 1);
    byExercise.get(entry.exerciseId)?.push({ sessionId, performedOn: entry.performedOn, ...cardioBestOf(entry.sets) });
  }
  return { data: byExercise, error: null };
}

/**
 * Melhores marcas de cardio de cada exercício em todos os treinos concluídos (o recorde a bater no
 * treino em andamento); exercício sem treino anterior com distância fica de fora (sem recorde).
 */
export async function fetchCardioBests(
  client: GufClient,
  exerciseIds: readonly string[],
): Promise<ApiResult<Map<string, CardioBest>>> {
  const histories = await fetchCardioHistories(client, exerciseIds);
  if (histories.error) return { data: null, error: histories.error };
  const bests = new Map<string, CardioBest>();
  for (const [exerciseId, sessions] of histories.data) {
    const best = mergeCardioBests(sessions);
    if (best) bests.set(exerciseId, best);
  }
  return { data: bests, error: null };
}
