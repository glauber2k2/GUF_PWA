import type { GufClient } from "./client";

/**
 * CONTRATO das funções de autenticação.
 *
 * As implementações reais (Supabase) entram na próxima etapa neste pacote, com estes
 * mesmos nomes e assinaturas. Até lá, apps/web/src/mocks/auth.ts implementa o contrato
 * (`satisfies AuthApi`), então integrar será só trocar a importação.
 */

/** Erros normalizados (as implementações reais mapeiam os erros do Supabase para estes códigos). */
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_already_registered"
  | "weak_password"
  | "rate_limited"
  | "network_error"
  | "unknown";

export interface AuthError {
  code: AuthErrorCode;
  /** Mensagem pronta para o usuário: diz o que aconteceu e como resolver. */
  message: string;
}

/** Mesmo formato do supabase-js: sucesso com `data` ou falha com `error`, nunca os dois. */
export type AuthResult<T> = { data: T; error: null } | { data: null; error: AuthError };

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: "E-mail ou senha incorretos. Confira os dados e tente de novo.",
  email_not_confirmed: "Confirme seu e-mail pelo link enviado para sua caixa de entrada e depois entre.",
  email_already_registered: "Este e-mail já tem conta. Entre com ele ou use “Esqueci minha senha”.",
  weak_password: "Senha fraca. Use 8 ou mais caracteres, com número e símbolo.",
  rate_limited: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.",
  network_error: "Sem conexão. Verifique a internet e tente de novo.",
  unknown: "Não foi possível concluir agora. Tente de novo em instantes.",
};

/** Monta um AuthError com a mensagem padrão do código. */
export function authError(code: AuthErrorCode): AuthError {
  return { code, message: AUTH_ERROR_MESSAGES[code] };
}

export interface SignInWithEmailInput {
  email: string;
  password: string;
}

export interface SignUpWithEmailInput {
  name: string;
  email: string;
  password: string;
  /** LGPD: "Tenho 18 anos ou mais" — precisa ser true. */
  isAdult: boolean;
  /** LGPD: "Li e aceito os Termos de Uso e a Política de Privacidade" — precisa ser true. */
  acceptsTerms: boolean;
}

export interface SignInWithGoogleInput {
  /** URL de retorno após o Google (deve estar nas redirect URLs do Supabase). */
  redirectTo: string;
}

export interface SignUpResult {
  userId: string;
  /** true quando o projeto exige confirmar o e-mail antes do primeiro acesso. */
  needsEmailConfirmation: boolean;
}

export type SignInWithEmail = (
  client: GufClient,
  input: SignInWithEmailInput,
) => Promise<AuthResult<{ userId: string }>>;

/**
 * Cria a conta (nome vai em user_metadata.name; o gatilho cria perfil e plano)
 * e registra o aceite dos documentos pendentes (accept_documents).
 */
export type SignUpWithEmail = (client: GufClient, input: SignUpWithEmailInput) => Promise<AuthResult<SignUpResult>>;

/**
 * Inicia o OAuth do Google e devolve a URL para onde o navegador deve ir.
 * Após o primeiro acesso, o app checa pending_documents() e manda para /aceite.
 */
export type SignInWithGoogle = (client: GufClient, input: SignInWithGoogleInput) => Promise<AuthResult<{ url: string }>>;

export interface AuthApi {
  signInWithEmail: SignInWithEmail;
  signUpWithEmail: SignUpWithEmail;
  signInWithGoogle: SignInWithGoogle;
}
