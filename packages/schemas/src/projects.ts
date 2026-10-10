import { z } from "zod";

/** Limites do banco (projects.name/routines.name ≤ 100; projects.description ≤ 500). */
export const PROJECT_NAME_MAX_LENGTH = 100;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 500;
export const ROUTINE_NAME_MAX_LENGTH = 100;

const nameField = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Informe um nome.")
    .max(max, `Use até ${max} caracteres.`);

/** Criar/editar projeto. `activate` só é usado na criação. */
export const projectFormSchema = z.object({
  name: nameField(PROJECT_NAME_MAX_LENGTH),
  description: z
    .string()
    .trim()
    .max(PROJECT_DESCRIPTION_MAX_LENGTH, `Use até ${PROJECT_DESCRIPTION_MAX_LENGTH} caracteres na descrição.`),
  activate: z.boolean(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

/** Criar/renomear rotina. */
export const routineNameSchema = z.object({
  name: nameField(ROUTINE_NAME_MAX_LENGTH),
});

export type RoutineNameValues = z.infer<typeof routineNameSchema>;
