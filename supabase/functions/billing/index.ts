// =====================================================================
// GUF APP · Edge Function · Assinatura (ações do app)
// Chamada no app: client.functions.invoke("billing", { body: { action, ... } })
//   checkout   → { url } da página de pagamento (aceites gravados antes)
//   cancel     → { mode, refund } (7 dias = devolução + fim agora; depois = até o fim do período)
//   reactivate → { ok } (desfaz o cancelamento agendado)
//   portal     → { url } do portal do gateway (trocar cartão, faturas)
// Secrets: STRIPE_SECRET_KEY (chave restrita), APP_URL, ALLOWED_ORIGINS; opcional BILLING_PROVIDER,
// STRIPE_PORTAL_CONFIGURATION. Deploy: npx supabase functions deploy billing --use-api
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { createSupabaseBillingStore } from "../_shared/billing/store.ts";
import { bearerToken, corsHeadersFor, isOriginBlocked, jsonResponse } from "../_shared/http.ts";
import { BillingActionError, toBillingActionError } from "./action-error.ts";
import { checkout } from "./checkout.ts";
import type { BillingAction } from "./context.ts";
import { cancel, portal, reactivate } from "./manage.ts";

const BILLING_ACTIONS: Record<string, BillingAction> = { checkout, cancel, reactivate, portal };

const MAX_BODY_BYTES = 4_096;

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new BillingActionError("invalid_request", 413);
  try {
    const body = JSON.parse(text);
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // corpo inválido cai no erro abaixo
  }
  throw new BillingActionError("invalid_request", 400);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeadersFor(origin);
  if (isOriginBlocked(origin)) return jsonResponse({ code: "invalid_request" }, 403, cors);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ code: "invalid_request" }, 405, cors);

  try {
    const token = bearerToken(req);
    if (!token) throw new BillingActionError("not_authenticated", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) throw new BillingActionError("not_authenticated", 401);

    const appUrl = (Deno.env.get("APP_URL") ?? "").replace(/\/+$/, "");
    if (!appUrl.startsWith("https://") && !appUrl.startsWith("http://localhost")) {
      console.error("Cobrança: secret APP_URL ausente ou inválido");
      throw new BillingActionError("billing_unavailable", 503);
    }

    const body = await readBody(req);
    const action = typeof body.action === "string" && Object.hasOwn(BILLING_ACTIONS, body.action) ? BILLING_ACTIONS[body.action] : null;
    if (!action) throw new BillingActionError("invalid_request", 400);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const result = await action({ userId: user.id, email: user.email ?? null, userClient, store: createSupabaseBillingStore(admin), body, appUrl });
    return jsonResponse(result, 200, cors);
  } catch (error) {
    const known = toBillingActionError(error);
    return jsonResponse({ code: known.code }, known.status, cors);
  }
});
