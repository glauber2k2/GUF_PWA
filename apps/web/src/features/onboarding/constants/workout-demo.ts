import type { ExerciseView } from "@/features/workout";

/**
 * Exercícios de exemplo da demonstração do treino no tour (conteúdo do tutorial, não dados de
 * usuário: nada é lido nem gravado). Um aberto com 3 séries (a 1ª concluída) e outro recolhido.
 */

/** Séries de força do exemplo: sem distância nem tempo. */
const NO_CARDIO = { distanceKm: null, durationSeconds: null };
const strength = (weightKg: number, reps: number) => ({ weightKg, reps, ...NO_CARDIO });

export const WORKOUT_DEMO_EXERCISES: readonly ExerciseView[] = [
  {
    id: "tour-supino",
    exerciseId: "tour-supino",
    name: "Supino reto",
    muscleGroup: "peito",
    equipment: "barra",
    restSeconds: 90,
    note: null,
    best1RmKg: 85,
    cardioBest: null,
    open: true,
    flash: false,
    sets: [
      { id: "tour-s1", setNumber: 1, setType: "normal", weightKg: 60, reps: 10, isCompleted: true, previous: strength(60, 10), ...NO_CARDIO },
      { id: "tour-s2", setNumber: 2, setType: "normal", weightKg: 60, reps: 8, isCompleted: false, previous: strength(60, 8), ...NO_CARDIO },
      { id: "tour-s3", setNumber: 3, setType: "normal", weightKg: 60, reps: 8, isCompleted: false, previous: strength(57.5, 8), ...NO_CARDIO },
    ],
  },
  {
    id: "tour-remada",
    exerciseId: "tour-remada",
    name: "Remada curvada",
    muscleGroup: "costas",
    equipment: "barra",
    restSeconds: 90,
    note: null,
    best1RmKg: 70,
    cardioBest: null,
    open: false,
    flash: false,
    sets: [
      { id: "tour-r1", setNumber: 1, setType: "normal", weightKg: 50, reps: 10, isCompleted: false, previous: strength(50, 10), ...NO_CARDIO },
      { id: "tour-r2", setNumber: 2, setType: "normal", weightKg: 50, reps: 10, isCompleted: false, previous: strength(50, 10), ...NO_CARDIO },
      { id: "tour-r3", setNumber: 3, setType: "normal", weightKg: 50, reps: 10, isCompleted: false, previous: null, ...NO_CARDIO },
    ],
  },
];

export const WORKOUT_DEMO_NAME = "Treino A · Peito e costas";
export const WORKOUT_DEMO_ELAPSED = "18:42";
