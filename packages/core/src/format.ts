/**
 * Formatações de exibição em pt-BR (vírgula decimal, ponto de milhar).
 * Ex.: 82,5 · 12.480 · 80 × 10 · 1:30 · −2,5
 */

const LOCALE = "pt-BR";

/** Sinal de menos tipográfico (U+2212), usado em números negativos na interface. */
export const MINUS_SIGN = "−";

/** Sinal de multiplicação usado em "carga × reps" e "séries × reps". */
export const TIMES_SIGN = "×";

/** Número em pt-BR. Padrão: até 1 casa decimal (82,5 · 12.480). */
export function formatNumber(value: number, maxFractionDigits = 1): string {
  return value.toLocaleString(LOCALE, { maximumFractionDigits: maxFractionDigits });
}

/** Número com sinal explícito: +2,5 / −2,5 (sinal de menos tipográfico). */
export function formatSigned(value: number, maxFractionDigits = 1): string {
  const abs = formatNumber(Math.abs(value), maxFractionDigits);
  return value < 0 ? `${MINUS_SIGN}${abs}` : `+${abs}`;
}

/** Carga × repetições: "82,5 × 8". */
export function formatLoadReps(weightKg: number, reps: number): string {
  return `${formatNumber(weightKg)} ${TIMES_SIGN} ${reps}`;
}

/** Segundos como relógio m:ss — "1:30", "0:54". Valores negativos viram 0:00. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Repetições alvo da rotina (routine_exercises.target_reps é texto livre: "10", "8-12", "falha").
 * Intervalos usam travessão: "8–12".
 */
export function formatTargetReps(targetReps: string | null | undefined): string | null {
  const reps = targetReps?.trim();
  if (!reps) return null;
  return reps.replace(/\s*-\s*/g, "–");
}

/** Séries × repetições planejadas: "3 × 8–12", "3 × falha", "3 séries", "8–12 reps" ou null. */
export function formatPlannedSets(targetSets: number | null | undefined, targetReps: string | null | undefined): string | null {
  const reps = formatTargetReps(targetReps);
  if (targetSets && reps) return `${targetSets} ${TIMES_SIGN} ${reps}`;
  if (targetSets) return `${targetSets} ${targetSets === 1 ? "série" : "séries"}`;
  if (reps) return /^\d/.test(reps) ? `${reps} reps` : reps;
  return null;
}

/** Plural simples em pt-BR: plural(6, "exercício", "exercícios") → "6 exercícios". */
export function plural(count: number, one: string, many: string): string {
  return `${formatNumber(count, 0)} ${count === 1 ? one : many}`;
}
