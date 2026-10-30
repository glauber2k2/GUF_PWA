// =====================================================================
// GUF APP · Edge Function · Webhook do gateway de pagamento
// Única porta para o Pro pago nascer ou acabar. Sem JWT (quem chama é o gateway): a autenticidade vem
// da assinatura do evento, conferida pelo adaptador. Cada objeto é relido na API do gateway antes de
// gravar (eventos fora de ordem ou repetidos não voltam o estado); idempotente por id do evento.
// URL: https://<ref>.supabase.co/functions/v1/billing-webhook?provider=stripe
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET.
// Deploy: npx supabase functions deploy billing-webhook --no-verify-jwt --use-api
// Logs: só tipo e id do evento (nunca o corpo, e-mail ou valores).
// =====================================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleBillingEvent } from "../_shared/billing/event-handlers.ts";
import { BillingConfigError, InvalidWebhookError } from "../_shared/billing/provider.ts";
import { billingProviderFor, isProviderId } from "../_shared/billing/registry.ts";
import { createSupabaseBillingStore } from "../_shared/billing/store.ts";

/** Eventos do Stripe têm poucos KB; acima disso não é um evento legítimo. */
const MAX_BODY_BYTES = 512 * 1024;

const plain = (message: string, status: number) => new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return plain("Método não permitido", 405);

  const providerId = new URL(req.url).searchParams.get("provider") ?? "stripe";
  if (!isProviderId(providerId)) return plain("Gateway desconhecido", 404);

  const rawBody = await req.text();
  if (rawBody.length > MAX_BODY_BYTES) return plain("Corpo grande demais", 413);

  let provider;
  let event;
  try {
    provider = billingProviderFor(providerId);
    event = await provider.parseEvent(rawBody, req.headers);
  } catch (error) {
    if (error instanceof InvalidWebhookError) return plain("Assinatura inválida", 400);
    if (error instanceof BillingConfigError) {
      console.error("Cobrança: webhook sem configuração", { message: error.message });
      return plain("Indisponível", 503);
    }
    return plain("Evento inválido", 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const store = createSupabaseBillingStore(admin);

  try {
    const shouldProcess = await store.beginEvent(provider.id, event.id, event.type);
    if (!shouldProcess) return plain("Já processado", 200);
  } catch (error) {
    console.error("Cobrança: falha ao registrar evento", { type: event.type, id: event.id, message: (error as Error).message });
    return plain("Tente de novo", 500);
  }

  try {
    await handleBillingEvent({ provider, store }, event);
    await store.finishEvent(provider.id, event.id, null);
    return plain("ok", 200);
  } catch (error) {
    // 500 = o gateway reenvia depois; os handlers são idempotentes.
    const code = (error as { code?: string }).code ?? (error as Error).name ?? "error";
    console.error("Cobrança: evento não processado", { type: event.type, id: event.id, code, message: (error as Error).message });
    await store.finishEvent(provider.id, event.id, String(code)).catch(() => {});
    return plain("Tente de novo", 500);
  }
});
