import { z } from "zod";
import {
  EQUIPMENT_CODES,
  MUSCLE_GROUP_ORDER,
  PLAN_IMPORT_MAX_CHARS,
  PLAN_IMPORT_MAX_EXERCISES_PER_ROUTINE,
  PLAN_IMPORT_MAX_ROUTINES,
} from "@guf/core";
import { PROJECT_NAME_MAX_LENGTH, ROUTINE_NAME_MAX_LENGTH } from "./projects";
import { EXERCISE_NOTE_MAX_LENGTH, ROUTINE_SETS_MAX, ROUTINE_SETS_MIN, TARGET_REPS_MAX_LENGTH } from "./routines";

/** Limite de exercises.name no banco. */
const EXERCISE_NAME_MAX_LENGTH = 100;
/** Descanso máximo de routine_exercises.rest_seconds. */
const REST_SECONDS_MAX = 900;

/** Texto colado para converter (ficha do personal, por exemplo). */
export const planImportTextSchema = z
  .string()
  .trim()
  .min(1, "Cole a ficha de treino para converter.")
  .max(PLAN_IMPORT_MAX_CHARS, `Use até ${PLAN_IMPORT_MAX_CHARS.toLocaleString("pt-BR")} caracteres. Divida a ficha e importe uma parte de cada vez.`);

/**
 * Exercício da ficha: um do catálogo do guf (o GUF AI só sugere estes), um próprio da pessoa (escolhido
 * na revisão) ou um novo, criado como exercício próprio. Exercício de outra pessoa nunca entra.
 */
const planImportMatchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("catalog"),
    // O banco confere que é do catálogo do guf (import_training_plan, GI001).
    exerciseId: z.string().min(1).max(64),
    name: z.string().min(1).max(EXERCISE_NAME_MAX_LENGTH),
    muscleGroup: z.string().min(1),
  }),
  z.object({
    kind: z.literal("own"),
    exerciseId: z.string().min(1).max(64),
    name: z.string().min(1).max(EXERCISE_NAME_MAX_LENGTH),
    muscleGroup: z.string().min(1),
  }),
  z.object({
    kind: z.literal("new"),
    name: z.string().trim().min(1, "Dê um nome para o exercício.").max(EXERCISE_NAME_MAX_LENGTH, `Use até ${EXERCISE_NAME_MAX_LENGTH} caracteres.`),
    muscleGroup: z.enum(MUSCLE_GROUP_ORDER),
    equipment: z.enum(EQUIPMENT_CODES),
  }),
]);

const planImportExerciseSchema = z.object({
  /** Identificador local do item no rascunho (não vai para o banco). */
  key: z.string().min(1).max(64),
  /** Como o exercício estava escrito na ficha. */
  sourceName: z.string().max(EXERCISE_NAME_MAX_LENGTH * 2),
  match: planImportMatchSchema,
  targetSets: z.number().int().min(ROUTINE_SETS_MIN).max(ROUTINE_SETS_MAX),
  // Opcional, como na rotina: ficha sem repetições chega em branco e a pessoa preenche se quiser.
  targetReps: z.string().trim().max(TARGET_REPS_MAX_LENGTH, `Use até ${TARGET_REPS_MAX_LENGTH} caracteres nas repetições.`),
  restSeconds: z.number().int().min(0).max(REST_SECONDS_MAX),
  notes: z.string().trim().max(EXERCISE_NOTE_MAX_LENGTH),
});

const planImportRoutineSchema = z.object({
  key: z.string().min(1).max(64),
  name: z.string().trim().min(1, "Dê um nome para a rotina.").max(ROUTINE_NAME_MAX_LENGTH, `Use até ${ROUTINE_NAME_MAX_LENGTH} caracteres.`),
  /** Dias da semana (1 = segunda … 7 = domingo, como no banco). */
  weekdays: z.array(z.number().int().min(1).max(7)).max(7),
  /**
   * Rotina que já existe no projeto de destino, escolhida na revisão: os exercícios entram no fim dela
   * (nome e dias dela continuam). Ausente = rotina nova. O GUF AI nunca preenche; o banco confere o dono.
   */
  intoRoutineId: z.string().min(1).max(64).optional(),
  exercises: z.array(planImportExerciseSchema).min(1, "A rotina precisa de pelo menos 1 exercício.").max(PLAN_IMPORT_MAX_EXERCISES_PER_ROUTINE),
});

/** Ficha convertida pelo GUF AI, revisada pela pessoa antes de criar. */
export const planImportDraftSchema = z.object({
  projectName: z.string().trim().min(1, "Dê um nome para o projeto.").max(PROJECT_NAME_MAX_LENGTH, `Use até ${PROJECT_NAME_MAX_LENGTH} caracteres.`),
  routines: z.array(planImportRoutineSchema).min(1, "Mantenha pelo menos 1 rotina.").max(PLAN_IMPORT_MAX_ROUTINES),
});

export type PlanImportMatch = z.infer<typeof planImportMatchSchema>;
export type PlanImportExercise = z.infer<typeof planImportExerciseSchema>;
export type PlanImportRoutine = z.infer<typeof planImportRoutineSchema>;
export type PlanImportDraft = z.infer<typeof planImportDraftSchema>;
