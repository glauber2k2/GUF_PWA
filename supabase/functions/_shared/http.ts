// HTTP comum das Edge Functions chamadas pelo app: CORS pela lista ALLOWED_ORIGINS e respostas JSON.
// (guf-ai e delete-account têm cópias antigas; funções novas usam esta.)

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

/** A origem do pedido está fora da lista (sem lista, qualquer origem vale). */
export function isOriginBlocked(origin: string | null): boolean {
  return Boolean(origin) && allowedOrigins.length > 0 && !allowedOrigins.includes(origin!);
}

export function corsHeadersFor(origin: string | null): Record<string, string> {
  const allow = allowedOrigins.length === 0 ? "*" : origin && allowedOrigins.includes(origin) ? origin : null;
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}

/** Token do cabeçalho Authorization (sem "Bearer "). */
export function bearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
}
