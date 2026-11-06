// Cliente mínimo da Google Play Developer API (androidpublisher v3) com fetch.
// Referência: https://developers.google.com/android-publisher/api-ref/rest
import { BillingConfigError, ProviderRequestError } from "../../provider.ts";
import { googleAccessToken } from "./google-auth.ts";

const API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";
const REQUEST_TIMEOUT_MS = 15_000;

export interface PlayClient {
  readonly packageName: string;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown, query?: Record<string, string>): Promise<T>;
}

/** Nome do pacote do app na Play (secret GOOGLE_PLAY_PACKAGE_NAME). */
export function playPackageName(): string {
  const packageName = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME");
  if (!packageName) throw new BillingConfigError("GOOGLE_PLAY_PACKAGE_NAME ausente");
  return packageName;
}

export function createPlayClient(): PlayClient {
  const packageName = playPackageName();
  const base = `${API_BASE}/${encodeURIComponent(packageName)}`;

  async function request<T>(method: "GET" | "POST", path: string, body?: unknown, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${base}${path}`);
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${await googleAccessToken()}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    const json = text ? (JSON.parse(text) as unknown) : {};
    if (!response.ok) {
      const error = (json as { error?: { message?: string; status?: string } }).error;
      throw new ProviderRequestError(error?.message ?? "Google Play recusou o pedido", response.status, error?.status ?? null);
    }
    return json as T;
  }

  return {
    packageName,
    get: (path) => request("GET", path),
    post: (path, body, query) => request("POST", path, body, query),
  };
}
