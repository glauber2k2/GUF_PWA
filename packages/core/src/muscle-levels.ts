/** Mapa muscular (boneco frente/costas): resumo do treino e stories */

/** Regiões do boneco (Claude Design "StoryArt"). */
export type FigureMuscle =
  | "peito"
  | "ombro"
  | "costas"
  | "trapezio"
  | "abdomen"
  | "biceps"
  | "triceps"
  | "antebraco"
  | "gluteos"
  | "quadriceps"
  | "posterior"
  | "panturrilha";

/** Intensidade da região: 1 (leve) a 3 (principal). */
export type MuscleLevels = Partial<Record<FigureMuscle, 1 | 2 | 3>>;

/** Código do banco (exercises.muscle_group) → região do boneco; corpo inteiro e cardio não pintam. */
const MUSCLE_TO_FIGURE: Record<string, FigureMuscle | undefined> = {
  peito: "peito",
  costas: "costas",
  ombros: "ombro",
  biceps: "biceps",
  triceps: "triceps",
  antebraco: "antebraco",
  quadriceps: "quadriceps",
  posterior: "posterior",
  gluteos: "gluteos",
  panturrilha: "panturrilha",
  abdomen: "abdomen",
};

export const MUSCLE_FIGURE_LABELS: Record<FigureMuscle, string> = {
  peito: "Peito",
  ombro: "Ombro",
  costas: "Costas",
  trapezio: "Trapézio",
  abdomen: "Abdômen",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebraco: "Antebraço",
  gluteos: "Glúteos",
  quadriceps: "Quadríceps",
  posterior: "Posterior",
  panturrilha: "Panturrilha",
};

/** Região do boneco de um grupo do banco (exercises.muscle_group); corpo inteiro e cardio não têm. */
export function figureMuscleOf(muscleGroup: string): FigureMuscle | undefined {
  return MUSCLE_TO_FIGURE[muscleGroup];
}

/** Séries por região → nível 1–3 proporcional ao grupo mais treinado. */
export function muscleLevelsFromSets(setsByGroup: ReadonlyArray<{ muscleGroup: string; sets: number }>): MuscleLevels {
  const totals = new Map<FigureMuscle, number>();
  for (const { muscleGroup, sets } of setsByGroup) {
    const key = MUSCLE_TO_FIGURE[muscleGroup];
    if (key && sets > 0) totals.set(key, (totals.get(key) ?? 0) + sets);
  }
  const max = Math.max(0, ...totals.values());
  const levels: MuscleLevels = {};
  for (const [key, sets] of totals) levels[key] = Math.min(3, Math.max(1, Math.ceil((3 * sets) / max))) as 1 | 2 | 3;
  return levels;
}

/**
 * Legenda do boneco: regiões do nível mais alto para o mais baixo.
 * @param limit quantas mostrar (sem limite = todas)
 */
export function muscleLegend(levels: MuscleLevels, limit?: number): Array<{ muscle: FigureMuscle; label: string; level: 1 | 2 | 3 }> {
  const ranked = (Object.entries(levels) as Array<[FigureMuscle, 1 | 2 | 3]>)
    .sort((a, b) => b[1] - a[1])
    .map(([muscle, level]) => ({ muscle, label: MUSCLE_FIGURE_LABELS[muscle], level }));
  return limit === undefined ? ranked : ranked.slice(0, limit);
}

/** Níveis a partir dos exercícios do treino (só séries concluídas, sem aquecimento — a regra do resumo). */
export function muscleLevelsFromWorkout(
  exercises: ReadonlyArray<{ muscleGroup: string; sets: ReadonlyArray<{ isCompleted: boolean; setType: string }> }>,
): MuscleLevels {
  return muscleLevelsFromSets(
    exercises.map((e) => ({ muscleGroup: e.muscleGroup, sets: e.sets.filter((s) => s.isCompleted && s.setType !== "warmup").length })),
  );
}
