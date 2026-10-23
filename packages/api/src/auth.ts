import {
  isAuthError,
  isAuthImplicitGrantRedirectError,
  isAuthPKCECodeVerifierMissingError,
  isAuthRetryableFetchError,
  isAuthWeakPasswordError,
} from "@supabase/supabase-js";
import { PRIVACY_CONTACT_EMAIL } from "@guf/core";
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
  | "account_suspended"
  | "recovery_link_invalid"
  | "same_password"
  | "documents_unavailable"
  | "documents_outdated"
  | "oauth_cancelled"
  | "oauth_expired"
  | "oauth_unavailable"
  | "oauth_failed"
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
  recovery_link_invalid: "Este link para criar a senha venceu ou já foi usado. Peça um novo ao suporte do guf.",
  same_password: "A senha nova precisa ser diferente da anterior.",
  account_suspended: `Sua conta está suspensa pela equipe do guf. Para saber o motivo ou contestar, escreva para ${PRIVACY_CONTACT_EMAIL}.`,
  documents_unavailable: "Não foi possível carregar os Termos de Uso e a Política de Privacidade. Tente de novo em instantes.",
  documents_outdated: "Os termos foram atualizados. Confira a nova versão e aceite de novo.",
  oauth_cancelled: "Login com Google cancelado. Tente de novo ou entre com e-mail e senha.",
  oauth_expired: "O login com Google expirou ou foi aberto em outro navegador. Tente de novo neste aparelho.",
  oauth_unavailable: "O login com Google não está disponível no momento. Entre com e-mail e senha.",
  oauth_failed: "Não foi possível entrar com o Google. Tente de novo em instantes.",
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

/**
 * Abre a sessão pelo link de redefinição de senha (#access_token=…&refresh_token=…&type=recovery).
 * O link é implícito de propósito: pedido pela equipe, ele é aberto em outro aparelho, onde o PKCE
 * não teria o código guardado.
 */
export type SetRecoverySession = (client: GufClient, hash: string) => Promise<AuthResult<null>>;

/** Grava a senha nova da sessão aberta pelo link. */
export type UpdatePassword = (client: GufClient, password: string) => Promise<AuthResult<null>>;

export interface AuthApi {
  signInWithEmail: SignInWithEmail;
  signUpWithEmail: SignUpWithEmail;
  signInWithGoogle: SignInWithGoogle;
  signOut: SignOut;
  setRecoverySession: SetRecoverySession;
  updatePassword: UpdatePassword;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

/** Conta suspensa pelo painel (auth.users.banned_until): vale no login com senha e no retorno do Google. */
const BANNED_CODE = "user_banned";

/** Códigos de erro do Supabase Auth ligados ao fluxo OAuth/PKCE. */
const OAUTH_CODE_MAP: Record<string, AuthErrorCode> = {
  provider_disabled: "oauth_unavailable",
  oauth_provider_not_supported: "oauth_unavailable",
  bad_oauth_state: "oauth_expired",
  bad_oauth_callback: "oauth_expired",
  flow_state_not_found: "oauth_expired",
  flow_state_expired: "oauth_expired",
  bad_code_verifier: "oauth_expired",
};

export interface OAuthReturnParams {
  /** ?error= (padrão OAuth: access_denied, server_error…) */
  error?: string | null;
  /** ?error_code= (código do Supabase Auth) */
  errorCode?: string | null;
  /** ?error_description= */
  errorDescription?: string | null;
}

/**
 * Erro devolvido na URL de retorno do Google (?error=…&error_code=…&error_description=…).
 * Retorna null quando a URL não indica erro.
 */
export function oauthReturnError({ error, errorCode, errorDescription }: OAuthReturnParams): AuthError | null {
  if (!error && !errorCode) return null;
  if (errorCode === BANNED_CODE) return authError("account_suspended");
  if (errorCode && OAUTH_CODE_MAP[errorCode]) return authError(OAUTH_CODE_MAP[errorCode]!);
  if (error === "access_denied") return authError("oauth_cancelled");
  if (errorDescription && /provider is not enabled|unsupported provider/i.test(errorDescription)) {
    return authError("oauth_unavailable");
  }
  return authError("oauth_failed");
}

/** Converte qualquer erro do Supabase/rede no AuthError do app. */
export function toAuthError(error: unknown): AuthError {
  if (isAuthRetryableFetchError(error)) return authError("network_error");
  if (isAuthWeakPasswordError(error)) return authError("weak_password");
  // Retorno do OAuth (PKCE): verificador ausente = aberto em outro navegador/aba ou expirado.
  if (isAuthPKCECodeVerifierMissingError(error)) return authError("oauth_expired");
  if (isAuthImplicitGrantRedirectError(error)) {
    const details = error.details;
    return (
      oauthReturnError({ error: details?.error, errorCode: details?.code, errorDescription: error.message }) ??
      authError("oauth_failed")
    );
  }
  if (isAuthError(error) && error.code && OAUTH_CODE_MAP[error.code]) return authError(OAUTH_CODE_MAP[error.code]!);
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
      case "same_password":
        return authError("same_password");
      case BANNED_CODE:
        return authError("account_suspended");
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

export const setRecoverySession: SetRecoverySession = async (client, hash) => {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  // Link vencido ou já usado volta com #error_code=otp_expired (ou sem os tokens).
  if (params.get("error_code") === BANNED_CODE) return { data: null, error: authError("account_suspended") };
  if (!accessToken || !refreshToken || params.get("type") !== "recovery") return { data: null, error: authError("recovery_link_invalid") };
  try {
    const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return error ? { data: null, error: authError("recovery_link_invalid") } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toAuthError(e) };
  }
};

export const updatePassword: UpdatePassword = async (client, password) => {
  try {
    const { error } = await client.auth.updateUser({ password });
    return error ? { data: null, error: toAuthError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toAuthError(e) };
  }
};

/** Garante em tempo de compilação que a implementação segue o contrato. */
export const authApi = { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, setRecoverySession, updatePassword } satisfies AuthApi;
