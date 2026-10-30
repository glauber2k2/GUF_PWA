// Cliente mínimo da API REST do Stripe (sem biblioteca): formulário, versão fixa e erros.
import { ProviderRequestError } from "../../provider.ts";

const STRIPE_API_URL = "https://api.stripe.com/v1";
// Versão fixa: o formato das respostas não muda quando a conta atualiza a versão padrão.
// O webhook relê cada objeto por esta API, então a versão do endpoint de eventos não importa.
export const STRIPE_API_VERSION = "2024-06-20";
const REQUEST_TIMEOUT_MS = 15_000;

type FormValue = string | number | boolean | null | undefined | FormValue[] | { [key: string]: FormValue };
export type FormParams = Record<string, FormValue>;

/** `{ a: { b: 1 }, c: [x] }` → `a[b]=1&c[0]=x` (formato do Stripe). */
function appendForm(target: URLSearchParams, key: string, value: FormValue): void {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => appendForm(target, `${key}[${index}]`, item));
    return;
  }
  if (typeof value === "object") {
    for (const [child, childValue] of Object.entries(value)) appendForm(target, `${key}[${child}]`, childValue);
    return;
  }
  target.append(key, String(value));
}

function toForm(params: FormParams): URLSearchParams {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) appendForm(form, key, value);
  return form;
}

export interface StripeRequestOptions {
  idempotencyKey?: string;
}

export interface StripeClient {
  get<T>(path: string, params?: FormParams): Promise<T>;
  post<T>(path: string, params?: FormParams, options?: StripeRequestOptions): Promise<T>;
  del<T>(path: string, params?: FormParams): Promise<T>;
}

export function createStripeClient(secretKey: string): StripeClient {
  async function request<T>(method: "GET" | "POST" | "DELETE", path: string, params: FormParams = {}, options: StripeRequestOptions = {}): Promise<T> {
    const form = toForm(params);
    const hasBody = method === "POST";
    const query = !hasBody && form.size > 0 ? `?${form}` : "";
    const headers: Record<string, string> = {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
    };
    if (hasBody) headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

    let response: Response;
    try {
      response = await fetch(`${STRIPE_API_URL}${path}${query}`, {
        method,
        headers,
        body: hasBody ? form : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new ProviderRequestError("Stripe não respondeu", 0, null);
    }

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = (body as { error?: { code?: string; message?: string } } | null)?.error;
      throw new ProviderRequestError(error?.message ?? `Stripe respondeu ${response.status}`, response.status, error?.code ?? null);
    }
    return body as T;
  }

  return {
    get: (path, params) => request("GET", path, params),
    post: (path, params, options) => request("POST", path, params, options),
    del: (path, params) => request("DELETE", path, params),
  };
}
