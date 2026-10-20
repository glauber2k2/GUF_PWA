import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, HANDLE_PATTERN, normalizeHandle } from "@guf/core";
import { z } from "zod";
import { NAME_MAX_LENGTH } from "./auth";

/** @usuário do módulo de seguidores (o banco confere a mesma regra e a unicidade). */
export const handleSchema = z
  .string()
  .transform(normalizeHandle)
  .pipe(
    z
      .string()
      .min(HANDLE_MIN_LENGTH, `Use pelo menos ${HANDLE_MIN_LENGTH} caracteres.`)
      .max(HANDLE_MAX_LENGTH, `Use até ${HANDLE_MAX_LENGTH} caracteres.`)
      .regex(HANDLE_PATTERN, "Use letras minúsculas, números, ponto ou _, sem começar ou terminar com ponto ou _."),
  );

export const socialHandleFormSchema = z.object({ handle: handleSchema });

export type SocialHandleFormValues = z.input<typeof socialHandleFormSchema>;

export const socialSettingsSchema = z.object({
  visibility: z.enum(["private", "open"]),
  historyHidden: z.boolean(),
});

export type SocialSettingsValues = z.infer<typeof socialSettingsSchema>;


/** Editar perfil: nome (mesma regra do Perfil) e @. */
export const editSocialProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe seu nome.")
    .max(NAME_MAX_LENGTH, `Use até ${NAME_MAX_LENGTH} caracteres.`),
  handle: handleSchema,
});

export type EditSocialProfileValues = z.input<typeof editSocialProfileSchema>;
