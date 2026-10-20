/** Regras do treino em andamento (puras, sem React). */
import { formatLoadReps, formatNumber } from "./format";
import type { SetType } from "./training";

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
  isCompleted: boolean;
}

/**
 * Marca a série que bate o recorde de carga do exercício: a de maior carga do treino (a primeira,
 * em caso de empate), se passar do recorde anterior. Bateu de novo numa série seguinte? O recorde
 * passa para ela: um recorde por exercício por treino, como no finish_workout.
 * Aquecimento e séries não concluídas não contam; sem histórico (previousBestKg nulo) não há PR.
 */
export function markLoadRecords(sets: readonly RecordCandidate[], previousBestKg: number | null | undefined): boolean[] {
  if (previousBestKg === null || previousBestKg === undefined) return sets.map(() => false);
  const counts = (s: RecordCandidate): s is RecordCandidate & { weightKg: number } =>
    s.isCompleted && s.setType !== "warmup" && typeof s.weightKg === "number";
  const sessionBest = sets.reduce((best, s) => (counts(s) && s.weightKg > best ? s.weightKg : best), previousBestKg);
  if (sessionBest <= previousBestKg) return sets.map(() => false);
  const recordIndex = sets.findIndex((s) => counts(s) && s.weightKg === sessionBest);
  return sets.map((_, i) => i === recordIndex);
}

/** "12 de 22 séries" */
export function setsProgressLabel(done: number, total: number): string {
  return `${done} de ${total} ${total === 1 ? "série" : "séries"}`;
}

/** Mensagem da confirmação de finalizar (mostra a consequência). */
export function finishWorkoutMessage(pendingSets: number): string {
  if (pendingSets <= 0) return "Todas as séries foram concluídas.";
  if (pendingSets === 1) return "1 série não foi concluída e não entra no histórico.";
  return `${pendingSets} séries não foram concluídas e não entram no histórico.`;
}

export interface NextSetCandidate {
  exerciseName: string;
  sets: ReadonlyArray<{ weightKg: number | null; reps: number | null; isCompleted: boolean }>;
}

/**
 * Próxima série pendente depois de (exerciseIndex, setIndex), para a barra de descanso:
 * "Próx.: Puxada frontal 65 × 8" · "Última série do treino".
 */
export function nextSetLabel(exercises: readonly NextSetCandidate[], exerciseIndex: number, setIndex: number): string {
  for (let e = exerciseIndex; e < exercises.length; e++) {
    const ex = exercises[e];
    if (!ex) continue;
    const start = e === exerciseIndex ? setIndex + 1 : 0;
    for (let s = start; s < ex.sets.length; s++) {
      const set = ex.sets[s];
      if (!set || set.isCompleted) continue;
      const load =
        typeof set.weightKg === "number" && typeof set.reps === "number"
          ? formatLoadReps(set.weightKg, set.reps)
          : typeof set.reps === "number"
            ? `${set.reps} reps`
            : "";
      return `Próx.: ${ex.exerciseName}${load ? ` ${load}` : ""}`;
    }
  }
  return "Última série do treino";
}

/** Rótulo de um desempenho anterior ("80 × 10") ou "—". */
export function previousLabel(previous: { weightKg: number | null; reps: number | null } | null | undefined): string {
  if (!previous || previous.reps === null) return "—";
  return previous.weightKg === null ? `${previous.reps} reps` : formatLoadReps(previous.weightKg, previous.reps);
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
