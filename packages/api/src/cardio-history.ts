import type { CardioBest } from "@guf/core";
import type { GufClient } from "./client";
import { toApiError, type ApiResult } from "./result";

/* =====================================================================
 * Melhores marcas de cardio (o recorde a bater; interno do pacote, fora do index).
 * Calculadas no banco por get_cardio_bests: uma linha por exercício, qualquer que seja o tamanho do
 * histórico (a API devolve no máximo 1.000 linhas por consulta). Só as séries da própria pessoa.
 * ===================================================================== */

/**
 * Melhor ritmo e maior distância de cada exercício de cardio.
 * @param beforeSessionId só os treinos concluídos antes deste (recordes de um treino passado); omitido = todos.
 * @returns mapa exercício → marcas; exercício sem treino anterior com distância fica de fora (primeira vez: sem recorde).
 */
export async function fetchCardioBests(
  client: GufClient,
  exerciseIds: readonly string[],
  beforeSessionId?: string,
): Promise<ApiResult<Map<string, CardioBest>>> {
  const ids = [...new Set(exerciseIds)];
  const bests = new Map<string, CardioBest>();
  if (ids.length === 0) return { data: bests, error: null };
  const { data, error } = await client.rpc("get_cardio_bests", { p_exercise_ids: ids, p_before_session_id: beforeSessionId });
  if (error) return { data: null, error: toApiError(error) };
  for (const row of data) {
    // Sem nenhuma série de 1 km ou mais, o banco devolve o ritmo nulo (os tipos gerados não marcam o nulo).
    const pace = row.best_seconds_per_km as number | null;
    const distance = row.best_distance_km as number | null;
    bests.set(row.exercise_id, { secondsPerKm: pace === null ? null : Number(pace), distanceKm: distance === null ? null : Number(distance) });
  }
  return { data: bests, error: null };
}
