/** Regras do treino em andamento (puras, sem React). */
import { formatNumber } from "./format";
import { estimate1RM, totalVolume, type SetLike, type SetType } from "./training";
import { toDisplayWeight, type WeightUnit } from "./units";

/** Ordem dos grupos musculares no seletor de exercícios (códigos de exercises.muscle_group). */
export const MUSCLE_GROUP_ORDER = [
  "peito",
  "costas",
  "ombros",
  "biceps",
  "triceps",
  "antebraco",
  "quadriceps",
  "posterior",
  "gluteos",
  "panturrilha",
  "abdomen",
  "corpo_inteiro",
  "cardio",
] as const;

export type MuscleGroupCode = (typeof MUSCLE_GROUP_ORDER)[number];

/** Grupos vistos de costas na silhueta do corpo. */
const BACK_VIEW_GROUPS = new Set(["costas", "triceps", "posterior", "gluteos", "panturrilha"]);

export function muscleGroupView(code: string): "front" | "back" {
  return BACK_VIEW_GROUPS.has(code) ? "back" : "front";
}

/** Códigos de exercises.equipment → rótulo em pt-BR (na ordem do seletor). */
export const EQUIPMENT_LABELS: Record<string, string> = {
  barra: "Barra",
  halter: "Halter",
  maquina: "Máquina",
  polia: "Polia",
  peso_corporal: "Peso corporal",
  kettlebell: "Kettlebell",
  smith: "Smith",
  elastico: "Elástico",
  outro: "Outro",
};

/** Códigos válidos de exercises.equipment (check do banco). */
export const EQUIPMENT_CODES = ["barra", "halter", "maquina", "polia", "peso_corporal", "kettlebell", "smith", "elastico", "outro"] as const;

export function equipmentLabel(code: string): string {
  return EQUIPMENT_LABELS[code] ?? code;
}

/** Texto para busca: minúsculo, sem acentos e sem espaços nas pontas. */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Palavras de um texto já normalizado (separa por espaço, hífen, pontuação). */
function searchWords(text: string): string[] {
  return normalizeSearch(text).split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Pontua um texto para a busca flexível: cada pedaço digitado precisa aparecer no texto, em qualquer
 * ordem e sem acento ("elev lat" → "Elevação lateral", "su reto" → "Supino reto", "reto sup" também).
 * Retorna null quando não combina. Quanto maior, mais parecido: pedaço que é início de palavra vale
 * mais que pedaço no meio da palavra, e o texto que começa com o primeiro pedaço ganha um bônus.
 * Sem nada digitado, tudo combina com pontuação 0.
 */
export function searchScore(query: string, ...texts: Array<string | null | undefined>): number | null {
  const tokens = searchWords(query);
  if (tokens.length === 0) return 0;
  const words = texts.flatMap((t) => (t ? searchWords(t) : []));
  if (words.length === 0) return null;
  let score = 0;
  for (const token of tokens) {
    if (words.some((w) => w.startsWith(token))) score += 2;
    else if (words.some((w) => w.includes(token))) score += 1;
    else return null;
  }
  return words[0]?.startsWith(tokens[0] ?? "") ? score + 1 : score;
}

/** Filtra e ordena pela busca flexível (mais parecidos primeiro; empate mantém a ordem original). */
export function searchFilter<T>(items: readonly T[], query: string, texts: (item: T) => Array<string | null | undefined>): T[] {
  return items
    .map((item, index) => ({ item, index, score: searchScore(query, ...texts(item)) }))
    .filter((x): x is { item: T; index: number; score: number } => x.score !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((x) => x.item);
}

/** Tempo decorrido com horas quando passar de 1h: "32:14", "1:01:05". */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** Trecho em que o treino estava RODANDO (workout_active_periods). endedAt nulo = em andamento. */
export interface ActivePeriod {
  startedAt: string;
  endedAt: string | null;
}

/** Relógio do treino: início real + períodos ativos (pausar fecha um, retomar abre outro). */
export interface WorkoutClock {
  /** ISO do início do treino. */
  startedAt: string;
  periods: ActivePeriod[];
}

const ms = (iso: string) => new Date(iso).getTime();

/**
 * Tempo EFETIVO de treino em segundos: soma dos períodos ativos (o aberto conta até agora).
 * Calculado a partir dos horários (não de um contador), então continua certo com a aba em
 * segundo plano, após recarregar ou depois de várias pausas. Mesma regra do finish_workout.
 */
export function workoutElapsedSeconds(clock: WorkoutClock, now: Date = new Date()): number {
  if (clock.periods.length === 0) return Math.max(0, Math.floor((now.getTime() - ms(clock.startedAt)) / 1000));
  const total = clock.periods.reduce(
    (sum, p) => sum + Math.max(0, (p.endedAt ? ms(p.endedAt) : now.getTime()) - ms(p.startedAt)),
    0,
  );
  return Math.floor(total / 1000);
}

/** Pausado = há períodos e nenhum está em andamento. */
export function isWorkoutPaused(clock: WorkoutClock): boolean {
  return clock.periods.length > 0 && clock.periods.every((p) => p.endedAt !== null);
}

/** Fecha o período aberto em `at` (já pausado → sem mudança). */
export function pauseClock(clock: WorkoutClock, at: Date = new Date()): WorkoutClock {
  if (isWorkoutPaused(clock)) return clock;
  return {
    ...clock,
    periods: clock.periods.map((p) =>
      p.endedAt === null ? { ...p, endedAt: new Date(Math.max(at.getTime(), ms(p.startedAt))).toISOString() } : p,
    ),
  };
}

/** Abre um período novo em `at`, nunca antes do fim do anterior (já rodando → sem mudança). */
export function resumeClock(clock: WorkoutClock, at: Date = new Date()): WorkoutClock {
  if (!isWorkoutPaused(clock) && clock.periods.length > 0) return clock;
  const lastEnd = clock.periods.reduce((max, p) => Math.max(max, p.endedAt ? ms(p.endedAt) : 0), ms(clock.startedAt));
  return { ...clock, periods: [...clock.periods, { startedAt: new Date(Math.max(at.getTime(), lastEnd)).toISOString(), endedAt: null }] };
}

/** Pausa ou retoma. */
export function toggleWorkoutPause(clock: WorkoutClock, at: Date = new Date()): WorkoutClock {
  return isWorkoutPaused(clock) ? resumeClock(clock, at) : pauseClock(clock, at);
}

/** Quantas pausas houve (períodos − 1). */
export function pauseCount(clock: WorkoutClock): number {
  return Math.max(0, clock.periods.length - 1);
}

export interface RecordCandidate {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  isCompleted: boolean;
}

/** 1RM estimado de uma série que conta para recorde (concluída e sem aquecimento); senão null. */
function candidate1Rm(set: RecordCandidate): number | null {
  if (!set.isCompleted || set.setType === "warmup") return null;
  return estimate1RM(set.weightKg, set.reps);
}

/**
 * Marca a série que bate o recorde do exercício, medido pelo 1RM estimado (Epley, igual ao banco):
 * vale subir a carga ou fazer mais repetições com a mesma carga. Fica a série de maior 1RM do
 * treino (a primeira, em caso de empate), se passar do melhor 1RM anterior; bater de novo move o
 * recorde para a nova série — um por exercício por treino, como no finish_workout.
 * Aquecimento e séries não concluídas não contam; sem histórico (previousBest1RmKg nulo) não há PR.
 */
export function markRecordSets(sets: readonly RecordCandidate[], previousBest1RmKg: number | null | undefined): boolean[] {
  if (previousBest1RmKg === null || previousBest1RmKg === undefined) return sets.map(() => false);
  const oneRms = sets.map(candidate1Rm);
  const sessionBest = oneRms.reduce<number>((best, value) => (value !== null && value > best ? value : best), previousBest1RmKg);
  if (sessionBest <= previousBest1RmKg) return sets.map(() => false);
  const recordIndex = oneRms.findIndex((value) => value === sessionBest);
  return sets.map((_, i) => i === recordIndex);
}

/** "12 de 22 séries" */
export function setsProgressLabel(done: number, total: number): string {
  return `${done} de ${total} ${total === 1 ? "série" : "séries"}`;
}

/** Volume do treino em andamento: só séries concluídas, sem aquecimento (o mesmo número do resumo). */
export function completedVolume(sets: ReadonlyArray<SetLike & { isCompleted: boolean }>): number {
  return totalVolume(sets.filter((set) => set.isCompleted));
}

/** "4.320 kg" na unidade do usuário (inteiro, como no resumo). */
export function volumeLabel(volumeKg: number, unit: WeightUnit): string {
  return `${formatNumber(Math.round(toDisplayWeight(volumeKg, unit) ?? 0), 0)} ${unit}`;
}

/** Mensagem da confirmação de finalizar (mostra a consequência). */
export function finishWorkoutMessage(pendingSets: number): string {
  if (pendingSets <= 0) return "Todas as séries foram concluídas.";
  if (pendingSets === 1) return "1 série não foi concluída e não entra no histórico.";
  return `${pendingSets} séries não foram concluídas e não entram no histórico.`;
}

/** Ajusta a carga por um delta (carga rápida), sem negativos e com 1 casa. */
export function adjustLoad(current: number | null, delta: number): number {
  return Math.max(0, Math.round(((current ?? 0) + delta) * 10) / 10);
}

/** Converte o texto do teclado ("82,5") em número; vazio → 0. */
export function parseKeypadValue(text: string): number {
  const n = Number.parseFloat(text.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Valor numérico como texto do teclado ("82,5"). */
export function toKeypadValue(value: number | null): string {
  return value === null ? "" : formatNumber(value).replace(/\./g, "");
}

/** Limites do tempo corrigido de um treino concluído (os mesmos do save_workout_edit no banco). */
export const EDITED_DURATION_MIN_SECONDS = 60;
export const EDITED_DURATION_MAX_SECONDS = 24 * 3600;

/** Horas, minutos e segundos de uma duração. */
export function toDurationParts(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.round(totalSeconds));
  return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
}

/**
 * Duração em segundos a partir de horas, minutos e segundos digitados.
 * @returns null quando algum campo é inválido (minutos e segundos de 0 a 59) ou o total fica fora
 * dos limites do tempo corrigido (1 min a 24 h)
 */
export function toEditedDurationSeconds(hours: number, minutes: number, seconds: number): number | null {
  if ([hours, minutes, seconds].some((n) => !Number.isInteger(n) || n < 0) || minutes > 59 || seconds > 59) return null;
  const total = hours * 3600 + minutes * 60 + seconds;
  return total >= EDITED_DURATION_MIN_SECONDS && total <= EDITED_DURATION_MAX_SECONDS ? total : null;
}
