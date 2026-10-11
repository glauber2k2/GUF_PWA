import { z } from "zod";
import { NAME_MAX_LENGTH } from "./auth";

/** Editar nome no Perfil (mesmo limite do cadastro: profiles.name ≤ 100). */
export const profileNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(NAME_MAX_LENGTH, `Use até ${NAME_MAX_LENGTH} caracteres.`),
});

export type ProfileNameValues = z.infer<typeof profileNameSchema>;

/** Meta semanal (profiles.weekly_goal: 1 a 7; só exibição — a sequência conta com 1 treino por semana). */
export const WEEKLY_GOAL_MIN = 1;
export const WEEKLY_GOAL_MAX = 7;

export const profilePreferencesSchema = z.object({
  weightUnit: z.enum(["kg", "lb"]),
  weeklyGoal: z.number().int().min(WEEKLY_GOAL_MIN).max(WEEKLY_GOAL_MAX),
});
