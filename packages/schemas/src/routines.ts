import { z } from "zod";
import { ROUTINE_NAME_MAX_LENGTH } from "./projects";

/** Limites do banco (routine_exercises): séries 1–20, repetições alvo até 20 caracteres, descanso 0–900 s. */
export const ROUTINE_SETS_MIN = 1;
export const ROUTINE_SETS_MAX = 20;
export const TARGET_REPS_MAX_LENGTH = 20;
export const EXERCISE_NOTE_MAX_LENGTH = 500;
/** Carga planejada (kg), opcional: 0–1000 (routine_exercises.target_weight_kg). */
export const TARGET_WEIGHT_MAX_KG = 1000;

export const plannedExerciseSchema = z.object({
  id: z.string(),
  targetSets: z.number().int().min(ROUTINE_SETS_MIN).max(ROUTINE_SETS_MAX),
  // Opcional: vazio = a rotina não define repetições (o treino começa sem repetições planejadas).
  targetReps: z.string().trim().max(TARGET_REPS_MAX_LENGTH, `Use até ${TARGET_REPS_MAX_LENGTH} caracteres.`),
  targetWeightKg: z.number().min(0).max(TARGET_WEIGHT_MAX_KG, `Use até ${TARGET_WEIGHT_MAX_KG} kg.`).nullable(),
  restSeconds: z.number().int().min(0).max(900),
  notes: z.string().trim().max(EXERCISE_NOTE_MAX_LENGTH, `Use até ${EXERCISE_NOTE_MAX_LENGTH} caracteres na observação.`),
});

/** Rotina para salvar: nome obrigatório, pelo menos 1 exercício, dias de 1 (segunda) a 7 (domingo). */
export const routineDraftSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome para a rotina, como “Treino A”.")
    .max(ROUTINE_NAME_MAX_LENGTH, `Use até ${ROUTINE_NAME_MAX_LENGTH} caracteres.`),
  weekdays: z.array(z.number().int().min(1).max(7)),
  exercises: z.array(plannedExerciseSchema).min(1, "Adicione pelo menos 1 exercício."),
});
