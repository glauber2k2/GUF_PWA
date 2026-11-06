// Token de acesso à Google Play Developer API pela conta de serviço (OAuth 2.0, JWT RS256 com Web Crypto,
// sem biblioteca). Referência: https://developers.google.com/identity/protocols/oauth2/service-account
import { BillingConfigError, ProviderRequestError } from "../../provider.ts";

const ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";
const ASSERTION_LIFETIME_SECONDS = 3600;
/** Renova o token um pouco antes de vencer (pedido em andamento não pega um token vencido). */
const REFRESH_MARGIN_SECONDS = 60;

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
}

let cached: { token: string; expiresAt: number } | null = null;

/** Lê a conta de serviço do secret GOOGLE_PLAY_SERVICE_ACCOUNT (o JSON baixado no Google Cloud). */
function readServiceAccount(): ServiceAccount {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
  if (!raw) throw new BillingConfigError("GOOGLE_PLAY_SERVICE_ACCOUNT ausente");
  try {
    const json = JSON.parse(raw) as { client_email?: string; private_key?: string; token_uri?: string };
    if (!json.client_email || !json.private_key) throw new Error("campos ausentes");
    return { clientEmail: json.client_email, privateKey: json.private_key, tokenUri: json.token_uri ?? DEFAULT_TOKEN_URI };
  } catch {
    throw new BillingConfigError("GOOGLE_PLAY_SERVICE_ACCOUNT inválido");
  }
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const encodeJson = (value: unknown) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
}

async function signedAssertion(account: ServiceAccount, nowSeconds: number): Promise<string> {
  const unsigned = `${encodeJson({ alg: "RS256", typ: "JWT" })}.${encodeJson({
    iss: account.clientEmail,
    scope: ANDROID_PUBLISHER_SCOPE,
    aud: account.tokenUri,
    iat: nowSeconds,
    exp: nowSeconds + ASSERTION_LIFETIME_SECONDS,
  })}`;
  const key = await importPrivateKey(account.privateKey);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

/** Token de acesso válido (reaproveitado enquanto não vence). */
export async function googleAccessToken(): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - REFRESH_MARGIN_SECONDS > nowSeconds) return cached.token;

  const account = readServiceAccount();
  const response = await fetch(account.tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: await signedAssertion(account, nowSeconds),
    }),
  });
  const json = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string } | null;
  if (!response.ok || !json?.access_token) {
    throw new ProviderRequestError("Google não liberou o acesso da conta de serviço", response.status, json?.error ?? null);
  }
  cached = { token: json.access_token, expiresAt: nowSeconds + (json.expires_in ?? ASSERTION_LIFETIME_SECONDS) };
  return cached.token;
}
