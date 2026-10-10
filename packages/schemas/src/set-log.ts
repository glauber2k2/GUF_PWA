import { z } from "zod";

/** Espelha os checks da tabela set_logs. */
export const setTypeSchema = z.enum(["warmup", "normal", "dropset", "failure"]);

export const weightKgSchema = z
  .number({ error: "Informe a carga em kg." })
  .min(0, "A carga não pode ser negativa.")
  .max(2000, "A carga máxima é 2000 kg.")
  .multipleOf(0.01, "Use no máximo 2 casas decimais.");

export const repsSchema = z
  .number({ error: "Informe as repetições." })
  .int("As repetições devem ser um número inteiro.")
  .min(0, "As repetições não podem ser negativas.")
  .max(1000, "O máximo é 1000 repetições.");

export type SetTypeInput = z.infer<typeof setTypeSchema>;
