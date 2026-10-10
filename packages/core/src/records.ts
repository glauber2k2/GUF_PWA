import type { SetType } from "./training";

export interface CompletedSetLike {
  setType: SetType;
  weightKg: number | null | undefined;
  done: boolean;
}

/**
 * A série bate o recorde de carga do exercício?
 * - Só séries concluídas e que não sejam aquecimento contam.
 * - `previousBestKg` nulo = primeira vez do exercício → nunca gera PR.
 * - Precisa ser estritamente maior que o recorde anterior.
 */
export function isLoadRecord(set: CompletedSetLike, previousBestKg: number | null | undefined): boolean {
  if (!set.done || set.setType === "warmup") return false;
  if (previousBestKg === null || previousBestKg === undefined) return false;
  if (typeof set.weightKg !== "number" || !Number.isFinite(set.weightKg)) return false;
  return set.weightKg > previousBestKg;
}
