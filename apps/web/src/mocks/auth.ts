/**
 * MOCK das funções de autenticação — mesmo contrato de @guf/api (AuthApi):
 * mesmos nomes, parâmetros e formato de retorno (incluindo os erros).
 *
 * Para integrar o Supabase: implementar estas funções em packages/api/src/auth.ts e
 * trocar `from "@/mocks/auth"` por `from "@guf/api"` nos formulários.
 *
 * Cenários simulados (para testar os estados da tela):
 * - Login com senha "errada"                → invalid_credentials
 * - Login com "naoconfirmado@email.com"     → email_not_confirmed
 * - Cadastro com "existe@email.com"         → email_already_registered
 * - Qualquer e-mail começando com "offline" → network_error
 * - Demais casos                            → sucesso
 */
import { authError, type AuthApi, type GufClient } from "@guf/api";

const LATENCY_MS = 700;

const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

/** O mock não usa o cliente; o parâmetro existe para manter a assinatura real. */
function ignoreClient(client: GufClient) {
  void client;
}

const isOffline = (email: string) => email.trim().toLowerCase().startsWith("offline");

export const signInWithEmail: AuthApi["signInWithEmail"] = async (client, { email, password }) => {
  ignoreClient(client);
  await wait();
  const normalized = email.trim().toLowerCase();
  if (isOffline(normalized)) return { data: null, error: authError("network_error") };
  if (password === "errada") return { data: null, error: authError("invalid_credentials") };
  if (normalized === "naoconfirmado@email.com") return { data: null, error: authError("email_not_confirmed") };
  return { data: { userId: "mock-user-id" }, error: null };
};

export const signUpWithEmail: AuthApi["signUpWithEmail"] = async (client, { email, isAdult, acceptsTerms }) => {
  ignoreClient(client);
  await wait();
  const normalized = email.trim().toLowerCase();
  // A real também recusa sem as duas confirmações de LGPD (a tela já impede o envio).
  if (!isAdult || !acceptsTerms) return { data: null, error: authError("unknown") };
  if (isOffline(normalized)) return { data: null, error: authError("network_error") };
  if (normalized === "existe@email.com") return { data: null, error: authError("email_already_registered") };
  return { data: { userId: "mock-user-id", needsEmailConfirmation: false }, error: null };
};

export const signInWithGoogle: AuthApi["signInWithGoogle"] = async (client, { redirectTo }) => {
  ignoreClient(client);
  await wait();
  // A real devolve a URL do Google; aqui volta direto para o destino.
  return { data: { url: redirectTo }, error: null };
};

/** Garante em tempo de compilação que o mock segue o contrato completo. */
export const mockAuthApi = { signInWithEmail, signUpWithEmail, signInWithGoogle } satisfies AuthApi;
