/** Nível de força da senha: 0 (muito fraca) a 4 (forte). */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export const PASSWORD_STRENGTH_LABELS: Record<PasswordStrength, string> = {
  0: "Muito fraca",
  1: "Fraca",
  2: "Média",
  3: "Boa",
  4: "Forte",
};

/** Requisito da senha nova (redefinir e alterar). Requisito novo = entrada aqui. */
export interface PasswordRequirement {
  key: "length" | "case" | "number" | "symbol";
  label: string;
  isMet: (password: string) => boolean;
}

/** Mínimo de caracteres da senha (o mesmo do cadastro). */
export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_REQUIREMENTS: readonly PasswordRequirement[] = [
  { key: "length", label: `${PASSWORD_MIN_LENGTH}+ caracteres`, isMet: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: "case", label: "Maiúscula e minúscula", isMet: (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) },
  { key: "number", label: "Um número", isMet: (p) => /\d/.test(p) },
  { key: "symbol", label: "Um símbolo", isMet: (p) => /[^A-Za-z0-9]/.test(p) },
];

/**
 * Pontua a senha (indicador visual, não substitui a validação do cadastro):
 * +1 por requisito cumprido (PASSWORD_REQUIREMENTS).
 * Senhas com menos de 6 caracteres ficam no máximo em "Fraca".
 */
export function passwordStrength(password: string): PasswordStrength {
  let score = PASSWORD_REQUIREMENTS.filter((requirement) => requirement.isMet(password)).length;
  if (password.length < 6) score = Math.min(score, 1);
  return score as PasswordStrength;
}

/** A senha cumpre todos os requisitos? */
export function meetsPasswordRequirements(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((requirement) => requirement.isMet(password));
}

/** "recover" = pelo link do e-mail; "change" = logado, com a senha atual. */
export type PasswordFormMode = "recover" | "change";

export interface PasswordFormInput {
  mode: PasswordFormMode;
  /** Senha atual (só "change"). */
  current: string;
  next: string;
  confirm: string;
  /** O servidor recusou a senha atual na última tentativa. */
  isCurrentRejected: boolean;
  /** "Sair dos outros aparelhos" ligado (muda o texto do botão). */
  signsOutOthers: boolean;
}

export interface PasswordFormStatus {
  /** 0–100: requisitos cumpridos (o anel do topo). */
  progress: number;
  requirementsMet: boolean[];
  isStrong: boolean;
  isMatch: boolean;
  /** A confirmação já não tem como bater (erro mostrado sem esperar o envio). */
  isMismatch: boolean;
  isSameAsCurrent: boolean;
  isValid: boolean;
  /** O que falta (ou o que vai acontecer), abaixo do botão. */
  hint: string;
}

/** A confirmação já diverge: mais longa e diferente, ou o começo não bate. */
function confirmationDiverges(next: string, confirm: string): boolean {
  if (!confirm) return false;
  return confirm.length >= next.length ? confirm !== next : !next.startsWith(confirm);
}

function missingHint(missing: number): string {
  return missing === 1 ? "Falta 1 requisito na nova senha" : `Faltam ${missing} requisitos na nova senha`;
}

/**
 * Situação do formulário de senha nova (Claude Design "Recuperar e Alterar Senha"): o anel, os
 * requisitos, a confirmação e a frase do que falta. Alterar conta a senha atual como um passo.
 */
export function passwordFormStatus(input: PasswordFormInput): PasswordFormStatus {
  const isChange = input.mode === "change";
  const requirementsMet = PASSWORD_REQUIREMENTS.map((requirement) => requirement.isMet(input.next));
  const missing = requirementsMet.filter((met) => !met).length;
  const isStrong = missing === 0;
  const isMatch = input.confirm.length > 0 && input.confirm === input.next;
  const isSameAsCurrent = isChange && input.next.length > 0 && input.next === input.current;
  const hasCurrent = !isChange || input.current.length > 0;
  const isValid = hasCurrent && isStrong && isMatch && !isSameAsCurrent;

  const steps = [...requirementsMet, isMatch, ...(isChange ? [hasCurrent && !input.isCurrentRejected] : [])];
  const progress = Math.round((steps.filter(Boolean).length / steps.length) * 100);

  return {
    progress,
    requirementsMet,
    isStrong,
    isMatch,
    isMismatch: confirmationDiverges(input.next, input.confirm),
    isSameAsCurrent,
    isValid,
    hint: passwordFormHint(input, { hasCurrent, isStrong, missing, isSameAsCurrent, isMatch, isValid }),
  };
}

function passwordFormHint(
  input: PasswordFormInput,
  state: { hasCurrent: boolean; isStrong: boolean; missing: number; isSameAsCurrent: boolean; isMatch: boolean; isValid: boolean },
): string {
  if (state.isValid) return input.mode === "change" && input.signsOutOthers ? "Os outros aparelhos serão desconectados" : "Tudo certo para salvar";
  if (!state.hasCurrent) return "Informe a senha atual para continuar";
  if (!state.isStrong) return missingHint(state.missing);
  if (state.isSameAsCurrent) return "Escolha uma senha diferente da atual";
  return "Repita a nova senha para confirmar";
}

/** Frase sob o anel do topo. */
export function passwordProgressCaption(progress: number, isCurrentRejected: boolean): string {
  if (isCurrentRejected) return "Confira a senha atual";
  if (progress === 100) return "Pronto para salvar";
  if (progress === 0) return "Comece pela nova senha";
  return "Senha em construção";
}
