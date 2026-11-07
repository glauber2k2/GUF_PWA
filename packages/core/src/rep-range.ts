/**
 * Repetições alvo de um exercício da rotina: fixas ("3 × 10") ou faixa ("3 × 8–12").
 * No banco: routine_exercises.target_reps_min / target_reps_max (smallint). O modo não é gravado:
 * máximo nulo = fixas; máximo maior que o mínimo = faixa.
 */

/** Repetições alvo. `max` nulo = repetições fixas; senão faixa (`max` > `min`). */
export interface RepTarget {
  min: number;
  max: number | null;
}

/** Faixa normalizada para comparar repetições feitas (fixas viram min = max). */
export interface RepRange {
  min: number;
  max: number;
}

export type RepMode = "fixed" | "range";

/** Limites aceitos em cada ponta (iguais ao check do banco). */
export const REP_TARGET_MIN = 1;
export const REP_TARGET_MAX = 100;

/** Repetições de um exercício novo na rotina. */
export const DEFAULT_REP_TARGET: RepTarget = { min: 10, max: null };

/** Ao passar de fixas para faixa, a faixa abre este tanto para cada lado (10 → 8–12). */
const RANGE_SPREAD = 2;

export type RepRangeStatus = "below" | "within" | "above";

// "10", "8-12", "8–12", "8 a 12" (como se escreve na ficha; mesma regra de parse_rep_target no banco).
const RANGE_PATTERN = /^\s*(\d{1,3})\s*(?:(?:-|–|—|a|até)\s*(\d{1,3}))?\s*(?:reps?|repetições)?\s*$/i;

function clampCount(value: number): number {
  return Math.min(REP_TARGET_MAX, Math.max(REP_TARGET_MIN, Math.round(value)));
}

/**
 * Monta as repetições alvo a partir de mínimo e máximo, nos limites e na ordem certa.
 * @param max nulo ou igual ao mínimo = repetições fixas
 */
export function buildRepTarget(min: number, max: number | null): RepTarget {
  const low = clampCount(max === null ? min : Math.min(min, max));
  const high = max === null ? low : clampCount(Math.max(min, max));
  return { min: low, max: high > low ? high : null };
}

/** Repetições alvo a partir das colunas do banco; mínimo nulo = não definidas. */
export function toRepTarget(min: number | null | undefined, max: number | null | undefined): RepTarget | null {
  if (min === null || min === undefined) return null;
  return buildRepTarget(min, max ?? null);
}

/** Fixas ou faixa. */
export function repModeOf(target: RepTarget): RepMode {
  return target.max === null ? "fixed" : "range";
}

/**
 * Troca entre fixas e faixa mantendo o número perto do anterior: 10 → 8–12 e 8–12 → 10.
 * @returns o mesmo alvo quando já está no modo pedido
 */
export function switchRepMode(target: RepTarget, mode: RepMode): RepTarget {
  if (repModeOf(target) === mode) return target;
  if (mode === "fixed") return buildRepTarget(((target.max ?? target.min) + target.min) / 2, null);
  const low = Math.max(REP_TARGET_MIN, target.min - RANGE_SPREAD);
  return buildRepTarget(low, Math.max(low + 1, target.min + RANGE_SPREAD));
}

/** Maior mínimo possível numa faixa (o máximo fica sempre acima dele). */
export function rangeMinCeiling(target: RepTarget): number {
  return (target.max ?? REP_TARGET_MAX) - 1;
}

/** Menor máximo possível numa faixa. */
export function rangeMaxFloor(target: RepTarget): number {
  return target.min + 1;
}

/** Faixa para comparar as repetições feitas; null sem repetições definidas. */
export function toRepRange(target: RepTarget | null | undefined): RepRange | null {
  if (!target) return null;
  return { min: target.min, max: target.max ?? target.min };
}

/**
 * Lê repetições escritas em texto (ficha colada no GUF AI, app antigo).
 * @returns as repetições ou null quando o texto não é número nem faixa ("falha", vazio)
 */
export function parseRepTarget(text: string | null | undefined): RepTarget | null {
  const match = text?.match(RANGE_PATTERN);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] === undefined ? first : Number(match[2]);
  if ([first, second].some((value) => value < REP_TARGET_MIN || value > REP_TARGET_MAX)) return null;
  return buildRepTarget(first, second);
}

/** "10" ou "8–12". */
export function formatRepTarget(target: RepTarget): string {
  return target.max === null ? String(target.min) : `${target.min}–${target.max}`;
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

/** Texto de apoio do editor de repetições (o que o modo escolhido faz). */
export function repTargetHint(target: RepTarget): string {
  if (target.max === null) return `${target.min} repetições em todas as séries.`;
  return `Entre ${target.min} e ${target.max} por série. No treino, o guf avisa quando a série ficar abaixo ou acima da faixa.`;
}
