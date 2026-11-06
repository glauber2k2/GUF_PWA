/**
 * Faixa de repetições de um exercício da rotina ("8-12"). Fica no mesmo texto de
 * routine_exercises.target_reps: rotinas antigas ("10", "8–12", "falha") continuam valendo e o
 * banco não muda.
 */

export interface RepRange {
  min: number;
  max: number;
}

/** Limites aceitos em cada ponta da faixa. */
export const REP_RANGE_MIN = 1;
export const REP_RANGE_MAX = 100;

export type RepRangeStatus = "below" | "within" | "above";

// "10", "8-12", "8–12", "8 a 12" (o travessão vem do formatTargetReps; "a" é como se escreve na ficha).
const RANGE_PATTERN = /^\s*(\d{1,3})\s*(?:(?:-|–|—|a|até)\s*(\d{1,3}))?\s*(?:reps?|repetições)?\s*$/i;

function isValidCount(value: number): boolean {
  return Number.isInteger(value) && value >= REP_RANGE_MIN && value <= REP_RANGE_MAX;
}

/**
 * Lê a faixa das repetições alvo da rotina.
 * @returns a faixa (min ≤ max) ou null quando o texto não é uma faixa numérica ("falha", vazio)
 */
export function parseRepRange(targetReps: string | null | undefined): RepRange | null {
  const match = targetReps?.match(RANGE_PATTERN);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] === undefined ? first : Number(match[2]);
  if (!isValidCount(first) || !isValidCount(second)) return null;
  return { min: Math.min(first, second), max: Math.max(first, second) };
}

/**
 * Texto gravado em target_reps a partir dos campos da faixa ("8-12", "10" ou vazio).
 * @param min repetições mínimas (null = vazio)
 * @param max repetições máximas (null = só o mínimo)
 */
export function toTargetRepsText(min: number | null, max: number | null): string {
  if (min === null && max === null) return "";
  const low = min ?? max ?? 0;
  const high = max ?? low;
  const [from, to] = low <= high ? [low, high] : [high, low];
  return from === to ? String(from) : `${from}-${to}`;
}

/** Onde as repetições feitas ficaram em relação à faixa; null sem faixa ou sem repetições. */
export function repRangeStatus(reps: number | null | undefined, range: RepRange | null | undefined): RepRangeStatus | null {
  if (!range || reps === null || reps === undefined || reps <= 0) return null;
  if (reps < range.min) return "below";
  if (reps > range.max) return "above";
  return "within";
}

/** "8–12" ou "10" (como a faixa aparece nos avisos). */
export function formatRepRange(range: RepRange): string {
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
}

/** Aviso ao concluir uma série fora da faixa (o que aconteceu e o que fazer). */
export function repRangeAlert(status: RepRangeStatus, range: RepRange): { title: string; message: string } | null {
  const target = `${formatRepRange(range)} repetições`;
  if (status === "below") {
    return { title: "Abaixo da faixa de repetições", message: `A meta é ${target}. Se não conseguiu chegar, considere reduzir a carga na próxima série.` };
  }
  if (status === "above") {
    return { title: "Acima da faixa de repetições", message: `A meta é ${target}. Você passou dela: aumente a carga na próxima série.` };
  }
  return null;
}
