import type { ExerciseView } from "@/features/workout";

/**
 * Exercícios de exemplo da demonstração do treino no tour (conteúdo do tutorial, não dados de
 * usuário: nada é lido nem gravado). Um aberto com 3 séries (a 1ª concluída) e outro recolhido.
 */
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
    open: true,
    flash: false,
    sets: [
      { id: "tour-s1", setNumber: 1, setType: "normal", weightKg: 60, reps: 10, isCompleted: true, previous: { weightKg: 60, reps: 10 } },
      { id: "tour-s2", setNumber: 2, setType: "normal", weightKg: 60, reps: 8, isCompleted: false, previous: { weightKg: 60, reps: 8 } },
      { id: "tour-s3", setNumber: 3, setType: "normal", weightKg: 60, reps: 8, isCompleted: false, previous: { weightKg: 57.5, reps: 8 } },
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
    open: false,
    flash: false,
    sets: [
      { id: "tour-r1", setNumber: 1, setType: "normal", weightKg: 50, reps: 10, isCompleted: false, previous: { weightKg: 50, reps: 10 } },
      { id: "tour-r2", setNumber: 2, setType: "normal", weightKg: 50, reps: 10, isCompleted: false, previous: { weightKg: 50, reps: 10 } },
      { id: "tour-r3", setNumber: 3, setType: "normal", weightKg: 50, reps: 10, isCompleted: false, previous: null },
    ],
  },
];

export const WORKOUT_DEMO_NAME = "Treino A · Peito e costas";
export const WORKOUT_DEMO_ELAPSED = "18:42";
