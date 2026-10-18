import { isNetworkError, type ApiResult } from "@guf/api";
import { offlineDb } from "./db";

/** Resultado com a origem: "network" (atual) ou "device" (última cópia salva, sem internet). */
export type CachedResult<T> = { value: T; source: "network" | "device" };

/**
 * Busca na rede e guarda a resposta no aparelho; sem conexão, devolve a última cópia salva.
 * Usado pelas telas de consulta (ex.: Histórico) para abrir offline.
 */
export async function withDeviceCache<T>(key: string, fetcher: () => Promise<ApiResult<T>>): Promise<ApiResult<CachedResult<T>>> {
  const table = offlineDb().history;
  const res = await fetcher();
  if (!res.error) {
    await table.put({ key, value: res.data, updatedAt: Date.now() });
    return { data: { value: res.data, source: "network" }, error: null };
  }
  if (isNetworkError(res.error)) {
    const cached = await table.get(key);
    if (cached) return { data: { value: cached.value as T, source: "device" }, error: null };
  }
  return { data: null, error: res.error };
}
