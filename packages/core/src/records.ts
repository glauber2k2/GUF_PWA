import { estimate1RM, type SetType } from "./training";

export interface CompletedSetLike {
  setType: SetType;
  weightKg: number | null | undefined;
  reps: number | null | undefined;
  done: boolean;
}

/**
 * A série bate o recorde do exercício? O recorde é medido pelo 1RM estimado (Epley): mais carga
 * ou mais repetições com a mesma carga contam.
 * - Só séries concluídas e que não sejam aquecimento contam.
 * - `previousBest1RmKg` nulo = primeira vez do exercício → nunca gera PR.
 * - Precisa ser estritamente maior que o recorde anterior.
 */
export function isSetRecord(set: CompletedSetLike, previousBest1RmKg: number | null | undefined): boolean {
  if (!set.done || set.setType === "warmup") return false;
  if (previousBest1RmKg === null || previousBest1RmKg === undefined) return false;
  const oneRm = estimate1RM(set.weightKg, set.reps);
  return oneRm !== null && oneRm > previousBest1RmKg;
}
