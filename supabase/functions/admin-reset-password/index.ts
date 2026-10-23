// =====================================================================
// GUF APP · Edge Function · Redefinir a senha de uma pessoa (painel apps/admin)
// Chamada no painel: supabase.functions.invoke('admin-reset-password', { body: { userId, reason, note } })
// O banco confere quem pede (admin_request_password_reset com o token do colaborador: equipe ativa,
// segundo fator, papel Suporte+, motivo; e audita). A service_role fica só aqui: busca o e-mail da
// pessoa (nunca vai ao navegador da equipe) e manda o e-mail de redefinição do Supabase Auth.
// O link abre o app em /redefinir-senha, onde a pessoa cria a senha nova (a equipe nunca a vê).
// Secrets: ALLOWED_ORIGINS (origem do painel), APP_URL (endereço do app, ex. https://app.guf.app).
// Deploy: npx supabase functions deploy admin-reset-password --use-api
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/$/, "");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Códigos do banco que viram resposta própria (o painel mostra a mensagem do ApiError). */
const DATABASE_ERRORS: Record<string, { status: number; code: string }> = {
  GA001: { status: 403, code: "staff_not_member" },
  GA002: { status: 403, code: "staff_mfa_required" },
  GA003: { status: 403, code: "staff_forbidden" },
  GA004: { status: 404, code: "account_not_found" },
  GA011: { status: 400, code: "reason_required" },
  GA014: { status: 400, code: "account_is_staff" },
  GA017: { status: 400, code: "account_banned" },
  GA018: { status: 400, code: "account_without_email" },
};

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allow = allowedOrigins.length === 0 ? "*" : origin && allowedOrigins.includes(origin) ? origin : null;
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

interface ResetBody {
  userId: string;
  reason: string;
  note: string | null;
}

function parseBody(raw: unknown): ResetBody | null {
  if (!raw || typeof raw !== "object") return null;
  const { userId, reason, note } = raw as Record<string, unknown>;
  if (typeof userId !== "string" || !UUID_PATTERN.test(userId) || typeof reason !== "string") return null;
  return { userId, reason, note: typeof note === "string" && note.trim() ? note.trim() : null };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = corsHeadersFor(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return json({ error: "Origem não autorizada" }, 403);
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  if (!appUrl) return json({ code: "password_reset_unavailable", error: "Falta configurar APP_URL na Edge Function." }, 500);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return json({ code: "not_authenticated" }, 401);
  const body = parseBody(await req.json().catch(() => null));
  if (!body) return json({ code: "unknown", error: "Pedido inválido." }, 400);

  // Com o token de quem chama: o banco confere a equipe e o papel e grava a auditoria.
  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { error: checkError } = await caller.rpc("admin_request_password_reset", {
    p_user_id: body.userId,
    p_reason: body.reason,
    p_note: body.note,
  });
  if (checkError) {
    const mapped = DATABASE_ERRORS[checkError.code ?? ""];
    return mapped ? json({ code: mapped.code }, mapped.status) : json({ code: "unknown" }, 500);
  }

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    // Implícito: o link volta com a sessão no endereço (#access_token=…), que funciona no aparelho da
    // pessoa. No PKCE o código só seria trocado no navegador que pediu (aqui, a própria função).
    auth: { persistSession: false, flowType: "implicit" },
  });
  const { data: target, error: userError } = await service.auth.admin.getUserById(body.userId);
  if (userError || !target.user?.email) return json({ code: "account_not_found" }, 404);

  const { error: sendError } = await service.auth.resetPasswordForEmail(target.user.email, {
    redirectTo: `${appUrl}/redefinir-senha/`,
  });
  if (sendError) {
    const tooMany = sendError.status === 429;
    console.error("Falha ao enviar redefinição de senha", { userId: body.userId, status: sendError.status });
    return json({ code: tooMany ? "password_reset_rate_limited" : "unknown" }, tooMany ? 429 : 500);
  }
  return json({ ok: true });
});
