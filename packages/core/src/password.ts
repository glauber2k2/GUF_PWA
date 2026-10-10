/** Nível de força da senha: 0 (muito fraca) a 4 (forte). */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: "Muito fraca",
  1: "Fraca",
  2: "Média",
  3: "Boa",
  4: "Forte",
};

/**
 * Pontua a senha (indicador visual, não substitui a validação do cadastro):
 * +1 com 8+ caracteres, +1 com maiúscula e minúscula, +1 com número, +1 com símbolo.
 * Senhas com menos de 6 caracteres ficam no máximo em "Fraca".
 */
export function passwordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length < 6) score = Math.min(score, 1);
  return score as PasswordStrength;
}
