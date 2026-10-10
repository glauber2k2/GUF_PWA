import { isAuthError, isAuthRetryableFetchError, isAuthWeakPasswordError } from "@supabase/supabase-js";
import type { GufClient } from "./client";

/* =====================================================================
 * Contrato
 * ===================================================================== */

/** Erros normalizados (os erros do Supabase são mapeados para estes códigos). */
export type AuthErrorCode =
  | "invalid_credentials"
  | "email_not_confirmed"
  | "email_already_registered"
  | "weak_password"
  | "rate_limited"
  | "documents_unavailable"
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
  documents_unavailable: "Não foi possível carregar os Termos de Uso e a Política de Privacidade. Tente de novo em instantes.",
  network_error: "Sem conexão. Verifique a internet e tente de novo.",
  unknown: "Não foi possível concluir agora. Tente de novo em instantes.",
};

/** Monta um AuthError com a mensagem padrão do código. */
export function authError(code: AuthErrorCode): AuthError {
  return { code, message: AUTH_ERROR_MESSAGES[code] };
}

export type Platform = "web" | "ios" | "android";

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
  /**
   * Ids das versões de terms, privacy e age_declaration exibidas na tela no momento do aceite.
   * O gatilho handle_new_user grava o aceite (só se forem as versões vigentes).
   */
  acceptedDocumentIds: string[];
  /** Para onde o link de confirmação de e-mail volta (origem atual do app). */
  emailRedirectTo: string;
  platform: Platform;
}

export interface SignInWithGoogleInput {
  /** URL de retorno após o Google (precisa estar nas Redirect URLs do Supabase). */
  redirectTo: string;
}

export interface SignUpResult {
  userId: string;
  /** true quando o projeto exige confirmar o e-mail antes do primeiro acesso (sem sessão ainda). */
  needsEmailConfirmation: boolean;
}

export type SignInWithEmail = (
  client: GufClient,
  input: SignInWithEmailInput,
) => Promise<AuthResult<{ userId: string }>>;

export type SignUpWithEmail = (client: GufClient, input: SignUpWithEmailInput) => Promise<AuthResult<SignUpResult>>;

/** Inicia o OAuth do Google (PKCE) e devolve a URL para onde o navegador deve ir. */
export type SignInWithGoogle = (client: GufClient, input: SignInWithGoogleInput) => Promise<AuthResult<{ url: string }>>;

export type SignOut = (client: GufClient) => Promise<AuthResult<null>>;

export interface AuthApi {
  signInWithEmail: SignInWithEmail;
  signUpWithEmail: SignUpWithEmail;
  signInWithGoogle: SignInWithGoogle;
  signOut: SignOut;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

/** Converte qualquer erro do Supabase/rede no AuthError do app. */
export function toAuthError(error: unknown): AuthError {
  if (isAuthRetryableFetchError(error)) return authError("network_error");
  if (isAuthWeakPasswordError(error)) return authError("weak_password");
  if (isAuthError(error)) {
    switch (error.code) {
      case "invalid_credentials":
        return authError("invalid_credentials");
      case "email_not_confirmed":
        return authError("email_not_confirmed");
      case "user_already_exists":
      case "email_exists":
        return authError("email_already_registered");
      case "weak_password":
        return authError("weak_password");
      case "over_request_rate_limit":
      case "over_email_send_rate_limit":
        return authError("rate_limited");
    }
    if (error.status === 429) return authError("rate_limited");
  }
  if (error instanceof TypeError) return authError("network_error"); // fetch sem conexão
  return authError("unknown");
}

export const signInWithEmail: SignInWithEmail = async (client, { email, password }) => {
  try {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { data: null, error: toAuthError(error) };
    return { data: { userId: data.user.id }, error: null };
  } catch (e) {
    return { data: null, error: toAuthError(e) };
  }
};

export const signUpWithEmail: SignUpWithEmail = async (client, input) => {
  // As duas confirmações LGPD são obrigatórias (a tela também impede o envio).
  if (!input.isAdult || !input.acceptsTerms || input.acceptedDocumentIds.length === 0) {
    return { data: null, error: authError("unknown") };
  }
  try {
    const { data, error } = await client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        emailRedirectTo: input.emailRedirectTo,
        data: {
          name: input.name.trim(),
          accepted_document_ids: input.acceptedDocumentIds,
          signup_platform: input.platform,
        },
      },
    });
    if (error) return { data: null, error: toAuthError(error) };
    if (!data.user) return { data: null, error: authError("unknown") };
    // Com confirmação de e-mail ligada, um e-mail já cadastrado volta como "usuário" sem identidades.
    if (data.user.identities && data.user.identities.length === 0) {
      return { data: null, error: authError("email_already_registered") };
    }
    return { data: { userId: data.user.id, needsEmailConfirmation: data.session === null }, error: null };
  } catch (e) {
    return { data: null, error: toAuthError(e) };
  }
};

export const signInWithGoogle: SignInWithGoogle = async (client, { redirectTo }) => {
  try {
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data.url) return { data: null, error: toAuthError(error) };
    return { data: { url: data.url }, error: null };
  } catch (e) {
    return { data: null, error: toAuthError(e) };
  }
};

export const signOut: SignOut = async (client) => {
  try {
    const { error } = await client.auth.signOut();
    if (error) return { data: null, error: toAuthError(error) };
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toAuthError(e) };
  }
};

/** Garante em tempo de compilação que a implementação segue o contrato. */
export const authApi = { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut } satisfies AuthApi;
