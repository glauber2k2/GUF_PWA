// Importar ficha de treino com o GUF AI: limites e textos puros (usados pelo app e espelhados na
// Edge Function guf-ai, que não importa os pacotes do monorepo).
import { plural } from "./format";

/** Tamanho máximo do texto colado (ficha enviada pelo personal, por exemplo). */
export const PLAN_IMPORT_MAX_CHARS = 6000;
export const PLAN_IMPORT_MAX_ROUTINES = 10;
export const PLAN_IMPORT_MAX_EXERCISES_PER_ROUTINE = 25;

/** Descanso quando a ficha não diz (mesmo do exercício novo na rotina; a Edge Function usa o mesmo, com 3 × 10). */
export const PLAN_IMPORT_DEFAULT_REST_SECONDS = 90;

export interface PlanImportCounts {
  routines: number;
  exercises: number;
  /** Exercícios que não existem no catálogo do guf e serão criados como seus. */
  newExercises: number;
}

/** Totais de uma ficha convertida (a forma mínima do rascunho, sem depender do contrato da API). */
export function planImportCounts(routines: ReadonlyArray<{ exercises: ReadonlyArray<{ match: { kind: string } }> }>): PlanImportCounts {
  const exercises = routines.flatMap((routine) => routine.exercises);
  return {
    routines: routines.length,
    exercises: exercises.length,
    newExercises: exercises.filter((exercise) => exercise.match.kind === "new").length,
  };
}

/** "3 rotinas · 18 exercícios · 2 novos" */
export function planImportSummary({ routines, exercises, newExercises }: PlanImportCounts): string {
  const parts = [plural(routines, "rotina", "rotinas"), plural(exercises, "exercício", "exercícios")];
  if (newExercises > 0) parts.push(plural(newExercises, "novo", "novos"));
  return parts.join(" · ");
}
