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

/** Tempo decorrido com horas quando passar de 1h: "32:14", "1:01:05". */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${seconds}` : `${minutes}:${seconds}`;
}

/** Estado do relógio do treino (início + pausas). */
export interface WorkoutClock {
  /** ISO do início do treino. */
  startedAt: string;
  /** Total de segundos já pausados (pausas encerradas). */
  pausedSeconds: number;
  /** ISO de quando a pausa atual começou; null se estiver rodando. */
  pausedAt: string | null;
}

/**
 * Segundos de treino: agora − início − pausas. Calculado a partir dos horários
 * (não de um contador), então continua certo com a aba em segundo plano ou após recarregar.
 */
export function workoutElapsedSeconds(clock: WorkoutClock, now: Date = new Date()): number {
  const start = new Date(clock.startedAt).getTime();
  const end = clock.pausedAt ? new Date(clock.pausedAt).getTime() : now.getTime();
  return Math.max(0, Math.floor((end - start) / 1000) - clock.pausedSeconds);
}

/** Pausa ou retoma o relógio, acumulando o tempo pausado. */
export function toggleWorkoutPause(clock: WorkoutClock, now: Date = new Date()): WorkoutClock {
  if (clock.pausedAt) {
    const pausedFor = Math.max(0, Math.floor((now.getTime() - new Date(clock.pausedAt).getTime()) / 1000));
    return { ...clock, pausedSeconds: clock.pausedSeconds + pausedFor, pausedAt: null };
  }
  return { ...clock, pausedAt: now.toISOString() };
}

export interface RecordCandidate {
  setType: SetType;
  weightKg: number | null;
  isCompleted: boolean;
}

/**
 * Marca as séries que batem recorde de carga, em sequência (cada recorde vira a nova referência).
 * Aquecimento e séries não concluídas não contam; sem histórico (previousBestKg nulo) não há PR.
 */
export function markLoadRecords(sets: readonly RecordCandidate[], previousBestKg: number | null | undefined): boolean[] {
  if (previousBestKg === null || previousBestKg === undefined) return sets.map(() => false);
  let best = previousBestKg;
  return sets.map((s) => {
    const isRecord = s.isCompleted && s.setType !== "warmup" && typeof s.weightKg === "number" && s.weightKg > best;
    if (isRecord) best = s.weightKg as number;
    return isRecord;
  });
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
