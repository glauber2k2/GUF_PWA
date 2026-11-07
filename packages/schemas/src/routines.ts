import { z } from "zod";
import { parseRepTarget, REP_TARGET_MAX, REP_TARGET_MIN } from "@guf/core";
import { ROUTINE_NAME_MAX_LENGTH } from "./projects";

/** Limites do banco (routine_exercises): séries 1–20, repetições 1–100, descanso 0–900 s. */
export const ROUTINE_SETS_MIN = 1;
export const ROUTINE_SETS_MAX = 20;
export const EXERCISE_NOTE_MAX_LENGTH = 500;
/** Carga planejada (kg), opcional: 0–1000 (routine_exercises.target_weight_kg). */
export const TARGET_WEIGHT_MAX_KG = 1000;

/** Repetições fixas (`max` nulo) ou faixa (`max` maior que `min`), como os checks do banco. */
export const repTargetSchema = z
  .object({
    min: z.number().int().min(REP_TARGET_MIN).max(REP_TARGET_MAX),
    max: z.number().int().max(REP_TARGET_MAX).nullable(),
  })
  .refine((target) => target.max === null || target.max > target.min, {
    message: "O máximo da faixa precisa ser maior que o mínimo.",
    path: ["max"],
  });

/**
 * Repetições opcionais (null = a rotina não define; o treino começa sem repetições planejadas).
 * Texto ("8-12", vindo da ficha convertida pelo GUF AI) é convertido; texto que não é número vira null.
 */
export const optionalRepTargetSchema = z.preprocess(
  (value) => (typeof value === "string" ? parseRepTarget(value) : value),
  repTargetSchema.nullable(),
);

export const plannedExerciseSchema = z.object({
  id: z.string(),
  targetSets: z.number().int().min(ROUTINE_SETS_MIN).max(ROUTINE_SETS_MAX),
  targetReps: optionalRepTargetSchema,
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
