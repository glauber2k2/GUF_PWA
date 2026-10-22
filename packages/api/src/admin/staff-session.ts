import { isStaffRole, type StaffRole } from "@guf/core";
import { signInWithEmail, signInWithGoogle as startGoogleSignIn, signOut as signOutSession, type AuthError } from "../auth";
import type { GufClient } from "../client";
import { apiError, toApiError, type ApiResult } from "../result";

/* =====================================================================
 * Contrato — Sessão do colaborador no painel (apps/admin).
 * Quem decide o acesso é o banco (admin_me + require_staff); aqui só se descobre em que passo a
 * pessoa está: entrar → configurar ou confirmar o segundo fator (TOTP do Supabase) → painel.
 * ===================================================================== */

export interface StaffMember {
  userId: string;
  displayName: string;
  email: string;
  role: StaffRole;
}

export type StaffAccess =
  | { status: "signed_out" }
  | { status: "not_staff"; email: string }
  | { status: "mfa_setup"; staff: StaffMember }
  | { status: "mfa_challenge"; staff: StaffMember }
  | { status: "ready"; staff: StaffMember };

export interface TotpEnrollment {
  factorId: string;
  /** QR code em SVG (data URI) gerado pelo Supabase Auth. */
  qrCode: string;
  /** Chave para digitar no aplicativo quando não dá para ler o QR code. */
  secret: string;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface StaffSessionApi {
  signIn: (client: GufClient, input: { email: string; password: string }) => Result;
  /** Google (PKCE): devolve a URL do Google; na volta, o código é trocado pela sessão ao carregar a página. */
  signInWithGoogle: (client: GufClient, input: { redirectTo: string }) => Result<{ url: string }>;
  /**
   * Link para criar uma senha nova. Sempre responde sucesso para e-mail válido (não revela se a
   * conta existe); o link abre `redirectTo` no mesmo navegador (PKCE).
   */
  requestPasswordReset: (client: GufClient, input: { email: string; redirectTo: string }) => Result;
  signOut: (client: GufClient) => Result;
  getStaffAccess: (client: GufClient) => Result<StaffAccess>;
  /** Novo segundo fator (apaga tentativas anteriores não confirmadas). */
  enrollTotp: (client: GufClient) => Result<TotpEnrollment>;
  /** Confirma o código; sem `factorId`, usa o fator já ativo. A sessão passa a aal2. */
  verifyTotp: (client: GufClient, input: { code: string; factorId?: string }) => Result;
  /**
   * Link do convite (#access_token=…&refresh_token=…) ou de "Esqueci a senha" (?code=…, trocado
   * pelo cliente ao carregar): deixa a sessão aberta para definir a senha.
   */
  setSessionFromLink: (client: GufClient, hash: string) => Result;
  /** Senha nova (primeiro acesso pelo convite ou "Esqueci a senha"). */
  setPassword: (client: GufClient, password: string) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const MFA_FRIENDLY_NAME = "guf admin";

/** Erros do Supabase Auth com a mensagem pronta (rede continua sendo rede). */
function fromAuthError(error: AuthError) {
  return { ...apiError(error.code === "network_error" ? "network_error" : "unknown"), message: error.message };
}

export const signIn: StaffSessionApi["signIn"] = async (client, input) => {
  const { error } = await signInWithEmail(client, input);
  if (!error) return { data: null, error: null };
  return { data: null, error: error.code === "invalid_credentials" ? apiError("invalid_credentials") : fromAuthError(error) };
};

export const signInWithGoogle: StaffSessionApi["signInWithGoogle"] = async (client, input) => {
  const { data, error } = await startGoogleSignIn(client, input);
  return error ? { data: null, error: fromAuthError(error) } : { data, error: null };
};

export const requestPasswordReset: StaffSessionApi["requestPasswordReset"] = async (client, { email, redirectTo }) => {
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (!error) return { data: null, error: null };
    const tooMany = (error as { status?: number }).status === 429;
    return {
      data: null,
      error: tooMany
        ? { ...apiError("unknown"), message: "Muitos pedidos seguidos. Espere alguns minutos e tente de novo." }
        : toApiError(error),
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const signOut: StaffSessionApi["signOut"] = async (client) => {
  const { error } = await signOutSession(client);
  return error ? { data: null, error: fromAuthError(error) } : { data: null, error: null };
};

export const getStaffAccess: StaffSessionApi["getStaffAccess"] = async (client) => {
  try {
    const { data: sessionData } = await client.auth.getSession();
    const session = sessionData.session;
    if (!session) return { data: { status: "signed_out" }, error: null };

    const { data, error } = await client.rpc("admin_me");
    if (error) return { data: null, error: toApiError(error) };
    const row = data?.[0];
    if (!row || !isStaffRole(row.role)) return { data: { status: "not_staff", email: session.user.email ?? "" }, error: null };

    const staff: StaffMember = { userId: row.user_id, displayName: row.display_name, email: row.email, role: row.role };
    if (!row.has_verified_factor) return { data: { status: "mfa_setup", staff }, error: null };
    const status = row.aal === "aal2" ? "ready" : "mfa_challenge";
    return { data: { status, staff }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const enrollTotp: StaffSessionApi["enrollTotp"] = async (client) => {
  try {
    const factors = await client.auth.mfa.listFactors();
    if (factors.error) return { data: null, error: toApiError(factors.error) };
    for (const stale of factors.data.all.filter((f) => f.factor_type === "totp" && f.status !== "verified")) {
      await client.auth.mfa.unenroll({ factorId: stale.id });
    }
    const { data, error } = await client.auth.mfa.enroll({ factorType: "totp", friendlyName: MFA_FRIENDLY_NAME, issuer: MFA_FRIENDLY_NAME });
    if (error) return { data: null, error: toApiError(error) };
    return { data: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const verifyTotp: StaffSessionApi["verifyTotp"] = async (client, { code, factorId }) => {
  try {
    let id = factorId;
    if (!id) {
      const factors = await client.auth.mfa.listFactors();
      if (factors.error) return { data: null, error: toApiError(factors.error) };
      id = factors.data.totp.find((f) => f.status === "verified")?.id;
    }
    if (!id) return { data: null, error: apiError("staff_mfa_required") };
    const { error } = await client.auth.mfa.challengeAndVerify({ factorId: id, code });
    if (!error) return { data: null, error: null };
    // Código errado ou vencido volta como erro de autenticação (422); rede continua como rede.
    const mapped = toApiError(error);
    return { data: null, error: mapped.code === "network_error" ? mapped : apiError("mfa_code_invalid") };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const setSessionFromLink: StaffSessionApi["setSessionFromLink"] = async (client, hash) => {
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      // "Esqueci a senha" volta com ?code= (PKCE), que o cliente já trocou pela sessão ao carregar.
      const { data } = await client.auth.getSession();
      return data.session ? { data: null, error: null } : { data: null, error: apiError("not_authenticated") };
    }
    const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const setPassword: StaffSessionApi["setPassword"] = async (client, password) => {
  try {
    const { error } = await client.auth.updateUser({ password });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const staffSessionApi = {
  signIn,
  signInWithGoogle,
  requestPasswordReset,
  signOut,
  getStaffAccess,
  enrollTotp,
  verifyTotp,
  setSessionFromLink,
  setPassword,
} satisfies StaffSessionApi;
