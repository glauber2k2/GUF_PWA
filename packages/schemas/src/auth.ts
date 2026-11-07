import { z } from "zod";
import { meetsPasswordRequirements, PASSWORD_MIN_LENGTH } from "@guf/core";

/** Mínimo exigido no cadastro (mais rígido que o mínimo do Supabase, que é 6); a regra mora no core. */
export { PASSWORD_MIN_LENGTH };

/** Até 100 caracteres: o gatilho de cadastro grava `name` em profiles com left(..., 100). */
export const NAME_MAX_LENGTH = 100;

/**
 * E-mail com mensagens que explicam como corrigir, sem culpar
 * (ex.: "Falta o final do e-mail, como “.com”.").
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Informe seu e-mail.")
  .superRefine((value, ctx) => {
    if (!value.includes("@")) {
      ctx.addIssue({ code: "custom", message: "Falta o @ no e-mail, como em voce@email.com." });
      return;
    }
    const [local = "", domain = ""] = value.split("@");
    if (!local) {
      ctx.addIssue({ code: "custom", message: "Falta o começo do e-mail, antes do @." });
      return;
    }
    if (!domain.includes(".") || domain.endsWith(".")) {
      ctx.addIssue({ code: "custom", message: "Falta o final do e-mail, como “.com”." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      ctx.addIssue({ code: "custom", message: "Confira o e-mail: ele tem espaços ou caracteres inválidos." });
    }
  });

/** Senha nova (cadastro e redefinição): mínimo do guf e o máximo do bcrypt (72). */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`)
  .max(72, "Use no máximo 72 caracteres na senha.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe sua senha."),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome (pelo menos 2 letras).")
    .max(NAME_MAX_LENGTH, `Use no máximo ${NAME_MAX_LENGTH} caracteres no nome.`),
  email: emailSchema,
  password: passwordSchema,
  /** LGPD: confirmação de idade, separada do aceite dos documentos. */
  isAdult: z.boolean().refine((v) => v, "Confirme que você tem 18 anos ou mais."),
  /** LGPD: aceite dos Termos de Uso e da Política de Privacidade. */
  acceptsTerms: z.boolean().refine((v) => v, "Aceite os Termos de Uso e a Política de Privacidade para continuar."),
});

/** Senha nova ao redefinir ou alterar: todos os requisitos (PASSWORD_REQUIREMENTS no core). */
export const strongPasswordSchema = passwordSchema.refine(meetsPasswordRequirements, {
  message: "Use maiúscula e minúscula, um número e um símbolo na senha.",
});

const CONFIRM_MESSAGE = "As senhas não coincidem. Confira letra por letra.";

/** Redefinir a senha pelo link do e-mail: digitada duas vezes. */
export const newPasswordSchema = z
  .object({ password: strongPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: CONFIRM_MESSAGE });

/** Alterar a senha logado: a atual, a nova (diferente da atual) e a confirmação. */
export const changePasswordSchema = z
  .object({ current: z.string().min(1, "Informe a senha atual."), password: strongPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: CONFIRM_MESSAGE })
  .refine((v) => v.password !== v.current, { path: ["password"], message: "A nova senha precisa ser diferente da atual." });

/** Pedir o link para criar uma senha nova. */
export const passwordRecoveryRequestSchema = z.object({ email: emailSchema });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type PasswordRecoveryRequestInput = z.infer<typeof passwordRecoveryRequestSchema>;
