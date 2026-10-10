/**
 * Cálculos de treino. Devem produzir exatamente os mesmos valores das funções
 * do banco (supabase/migrations/20261009000005_app_functions.sql).
 *
 * Os valores do banco são numeric(6,2) para carga e smallint para reps, por isso
 * as contas usam inteiros (centésimos de kg e BigInt) — evita erros de ponto flutuante e
 * reproduz a aritmética numeric e o round() do Postgres (meio arredonda para longe do zero).
 */

export type SetType = "warmup" | "normal" | "dropset" | "failure";

export interface SetLike {
  weightKg: number | null | undefined;
  reps: number | null | undefined;
  setType: SetType;
}

/** Carga em centésimos de kg (escala do numeric(6,2) do banco). */
function toHundredths(weightKg: number): number {
  return Math.round(weightKg * 100);
}

function isValidLoad(weightKg: number | null | undefined): weightKg is number {
  return typeof weightKg === "number" && Number.isFinite(weightKg) && weightKg >= 0;
}

function isValidReps(reps: number | null | undefined): reps is number {
  return typeof reps === "number" && Number.isInteger(reps) && reps >= 0;
}

/**
 * Arredonda num / den (ambos ≥ 0) para o inteiro mais próximo; meio vai para cima.
 * Para valores não negativos equivale ao round() do Postgres (meio longe do zero).
 */
function divRoundHalfUp(num: bigint, den: bigint): bigint {
  return (2n * num + den) / (2n * den);
}

/**
 * Casas decimais que o Postgres usa em `reps / 30.0` (select_div_scale):
 * 16 dígitos significativos → 20 casas quando reps ≤ 30 e 16 casas acima disso.
 * Reproduzir essa precisão garante o mesmo arredondamento do banco em empates
 * (ex.: 1,05 kg × 40 reps = 2,4 no banco, e não 2,5 da conta exata).
 */
function pgDivisionScale(reps: number): bigint {
  return reps <= 30 ? 20n : 16n;
}

/**
 * 1RM estimado pela fórmula de Epley: carga × (1 + reps / 30), arredondado para
 * 1 casa decimal — idêntico a `round(weight_kg * (1 + reps / 30.0), 1)` no banco.
 * Retorna null quando a carga é nula ou reps é 0 (ou inválido).
 * Quem chama deve ignorar aquecimentos — use `bestEstimated1RM` para listas de séries.
 */
export function estimate1RM(
  weightKg: number | null | undefined,
  reps: number | null | undefined,
): number | null {
  if (!isValidLoad(weightKg) || !isValidReps(reps) || reps === 0) return null;
  const scale = 10n ** pgDivisionScale(reps);
  // (1 + reps / 30) na escala do Postgres
  const factor = scale + divRoundHalfUp(BigInt(reps) * scale, 30n);
  // carga (centésimos) × fator → resultado × 100 × scale; arredonda para décimos
  const product = BigInt(toHundredths(weightKg)) * factor;
  return Number(divRoundHalfUp(product, 10n * scale)) / 10;
}

/** Maior 1RM estimado entre as séries, ignorando aquecimentos. */
export function bestEstimated1RM(sets: readonly SetLike[]): number | null {
  let best: number | null = null;
  for (const set of sets) {
    if (set.setType === "warmup") continue;
    const value = estimate1RM(set.weightKg, set.reps);
    if (value !== null && (best === null || value > best)) best = value;
  }
  return best;
}

/** Volume de uma série (carga × reps) em kg. Aquecimento ou dados nulos valem 0. */
export function setVolume(set: SetLike): number {
  if (set.setType === "warmup" || !isValidLoad(set.weightKg) || !isValidReps(set.reps)) return 0;
  return (toHundredths(set.weightKg) * set.reps) / 100;
}

/** Volume total (Σ carga × reps) em kg, ignorando séries de aquecimento. */
export function totalVolume(sets: readonly SetLike[]): number {
  let hundredths = 0;
  for (const set of sets) {
    if (set.setType === "warmup" || !isValidLoad(set.weightKg) || !isValidReps(set.reps)) continue;
    hundredths += toHundredths(set.weightKg) * set.reps;
  }
  return hundredths / 100;
}
