import type { CatalogExerciseUsage } from "@guf/api/admin";

export function isExerciseInUse(usage: CatalogExerciseUsage): boolean {
  return usage.routines + usage.workouts > 0;
}

/** "3 rotinas · 12 treinos" (só números: a equipe não vê quem usa). */
export function exerciseUsageLabel(usage: CatalogExerciseUsage): string {
  const routines = usage.routines === 1 ? "1 rotina" : `${usage.routines} rotinas`;
  const workouts = usage.workouts === 1 ? "1 treino" : `${usage.workouts} treinos`;
  return `${routines} · ${workouts}`;
}
