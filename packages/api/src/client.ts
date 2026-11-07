import { createClient, type SupabaseClient, type SupportedStorage } from "@supabase/supabase-js";
import type { Database } from "@guf/types";
import { withAccountSuspensionCheck, type AccountSuspendedListener } from "./account-suspension";

export type GufClient = SupabaseClient<Database>;

/** Tipos de sessão reexportados para os apps não dependerem do supabase-js diretamente. */
export type { Session, User } from "@supabase/supabase-js";

export interface GufClientConfig {
  url: string | undefined;
  /** Chave PÚBLICA (publishable). NUNCA a secret/service_role: a segurança vem do RLS. */
  publishableKey: string | undefined;
  /**
   * Onde guardar a sessão. Padrão: localStorage do navegador.
   * O app mobile (Expo) passa aqui o seu armazenamento (ex.: SecureStore/AsyncStorage).
   */
  storage?: SupportedStorage;
  /** Nomes das variáveis de ambiente, só para a mensagem de erro (web: NEXT_PUBLIC_*; mobile: EXPO_PUBLIC_*). */
  envNames?: { url: string; publishableKey: string };
  /** Chamado quando a API recusa a conta por estar suspensa (erro GU001), na primeira chamada que esbarrar nisso. */
  onAccountSuspended?: AccountSuspendedListener;
}

/**
 * Cria o cliente Supabase tipado do app:
 * - PKCE (código trocado no retorno de OAuth e links de e-mail);
 * - sessão persistente e renovada automaticamente;
 * - detecção da sessão na URL (troca o ?code= ao carregar a página de retorno);
 * - aviso de conta suspensa (`onAccountSuspended`), conferido em toda resposta da API REST.
 *
 * Quem chama lê as variáveis de ambiente (cada plataforma tem seu prefixo) e
 * deve manter uma única instância por app.
 */
export function createGufClient({
  url,
  publishableKey,
  storage,
  envNames = DEFAULT_ENV_NAMES,
  onAccountSuspended,
}: GufClientConfig): GufClient {
  assertSupabaseConfig(url, publishableKey, envNames);
  return createClient<Database>(url as string, publishableKey as string, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage,
    },
    global: onAccountSuspended
      ? { fetch: withAccountSuspensionCheck((input, init) => fetch(input, init), onAccountSuspended) }
      : undefined,
  });
}

const DEFAULT_ENV_NAMES = { url: "NEXT_PUBLIC_SUPABASE_URL", publishableKey: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" };

/** Confere as variáveis de ambiente do Supabase (falta de valor ou URL da API REST no lugar da base). */
function assertSupabaseConfig(url: string | undefined, publishableKey: string | undefined, envNames: { url: string; publishableKey: string }): void {
  const missing = [!url && envNames.url, !publishableKey && envNames.publishableKey].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Supabase não configurado: defina ${missing.join(" e ")} no arquivo de ambiente (.env.local).`);
  }
  // Erro comum: colar a URL da API REST (…/rest/v1/). O cliente precisa só da origem do projeto.
  const parsed = new URL(url as string);
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    throw new Error(
      `${envNames.url} deve ser só a URL base do projeto (ex.: ${parsed.origin}), sem "${parsed.pathname}". Corrija no arquivo de ambiente.`,
    );
  }
}

/**
 * Cliente só para pedir o link de "Esqueci minha senha" (`requestPasswordRecovery`). Sem PKCE de
 * propósito: o link traz a sessão no próprio endereço e abre em qualquer aparelho ou navegador
 * (o e-mail costuma ser aberto em outro). Não guarda sessão nem interfere no cliente do app.
 */
export function createPasswordRecoveryClient({ url, publishableKey, envNames = DEFAULT_ENV_NAMES }: Omit<GufClientConfig, "storage" | "onAccountSuspended">): GufClient {
  assertSupabaseConfig(url, publishableKey, envNames);
  return createClient<Database>(url as string, publishableKey as string, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "guf-password-recovery",
    },
  });
}
