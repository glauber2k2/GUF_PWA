import { differenceInMinutes } from "date-fns";
import { totalVolume, type SetType } from "./training";

/** Códigos de exercises.muscle_group → rótulo em pt-BR. */
const MUSCLE_GROUP_LABELS: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  ombros: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  quadriceps: "Quadríceps",
  posterior: "Posterior",
  gluteos: "Glúteos",
  panturrilha: "Panturrilha",
  abdomen: "Abdômen",
  corpo_inteiro: "Corpo inteiro",
  cardio: "Cardio",
};

export function muscleGroupLabel(code: string): string {
  return MUSCLE_GROUP_LABELS[code] ?? code;
}

/** Grupos musculares distintos, na ordem em que aparecem na rotina, já rotulados. */
export function routineMuscleGroups(codes: readonly string[], max = 3): string[] {
  return [...new Set(codes)].slice(0, max).map(muscleGroupLabel);
}

/** Valores usados quando a rotina não define séries/descanso. */
const DEFAULT_SETS = 3;
const DEFAULT_REST_SECONDS = 90;
/** Tempo médio de execução de uma série (segundos). */
const SET_EXECUTION_SECONDS = 40;

/**
 * Duração ESTIMADA da rotina em minutos (múltiplo de 5): Σ séries × (execução + descanso).
 * Sem exercícios → null. É só uma referência para o card ("~55 min").
 */
export function estimateRoutineMinutes(
  exercises: ReadonlyArray<{ targetSets: number | null; restSeconds: number | null }>,
): number | null {
  if (exercises.length === 0) return null;
  const seconds = exercises.reduce(
    (total, e) => total + (e.targetSets ?? DEFAULT_SETS) * (SET_EXECUTION_SECONDS + (e.restSeconds ?? DEFAULT_REST_SECONDS)),
    0,
  );
  return Math.max(5, Math.round(seconds / 60 / 5) * 5);
}

/** Total de séries planejadas (séries não definidas contam como o padrão de 3). */
export function plannedSetCount(exercises: ReadonlyArray<{ targetSets: number | null }>): number {
  return exercises.reduce((total, e) => total + (e.targetSets ?? DEFAULT_SETS), 0);
}

export interface LoggedSet {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  isCompleted: boolean;
}

/**
 * Números de um treino concluído (mesma regra de get_training_days para o volume):
 * - volume: Σ carga × reps das séries concluídas, sem aquecimento;
 * - séries: séries concluídas, sem aquecimento.
 */
export function sessionTotals(sets: readonly LoggedSet[]): { volumeKg: number; setCount: number } {
  const working = sets.filter((s) => s.isCompleted && s.setType !== "warmup");
  return { volumeKg: totalVolume(working), setCount: working.length };
}

/** Duração em segundos entre início e fim (nunca negativa). */
export function durationSeconds(startedAt: string, finishedAt: string | null | undefined, now: Date = new Date()): number {
  const end = finishedAt ? new Date(finishedAt) : now;
  return Math.max(0, Math.round((end.getTime() - new Date(startedAt).getTime()) / 1000));
}

/** "começou há 25 min" · "começou há 1 h 10 min" · "começou agora". */
export function startedAgoLabel(startedAt: string, now: Date = new Date()): string {
  const minutes = Math.max(0, differenceInMinutes(now, new Date(startedAt)));
  if (minutes < 1) return "começou agora";
  if (minutes < 60) return `começou há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `começou há ${hours} h${rest ? ` ${rest} min` : ""}`;
}
