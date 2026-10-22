// Respostas HTTP da guf-ai: CORS pela lista ALLOWED_ORIGINS (o mesmo secret da delete-account).

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, user-agent",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

/** Erro em texto puro: o transporte do AI SDK mostra o corpo da resposta como mensagem de erro. */
export function textResponse(message: string, status: number, cors: Record<string, string>): Response {
  return new Response(message, { status, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
}

export function jsonResponse(body: unknown, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { ...cors, "Content-Type": "application/json; charset=utf-8" } });
}
