// =====================================================================
// GUF APP · Edge Function · Excluir conta pelo painel (cancela a assinatura antes)
// O banco recusa excluir conta com assinatura viva (GA023, delete_account_now); esta função cancela
// no gateway com a mesma regra da exclusão pelo app (7 dias: devolve tudo; depois: encerra) e exclui.
//   Painel (excluir agora): supabase.functions.invoke('admin-delete-account', { body: { userId, reason, note } })
//     → admin_delete_user com o token do colaborador (equipe, segundo fator, papel Admin, motivo,
//       auditoria). Só depois de o banco aceitar a pessoa (GA023 vem depois dessas conferências)
//       a assinatura é cancelada e a exclusão tentada de novo.
//   Banco (exclusão agendada vencida, job execute-scheduled-account-deletions via pg_net):
//     cabeçalho x-guf-secret + { scheduled: true, userId } → confere a exclusão vencida, cancela e exclui.
// Secrets: ACCOUNT_CLOSURE_SECRET (o mesmo `account_closure_secret` do Vault), ALLOWED_ORIGINS, STRIPE_*.
// Deploy: npx supabase functions deploy admin-delete-account --no-verify-jwt --use-api
//   (sem verificação do gateway: a chamada do banco não tem JWT; o painel é conferido pelo banco)
// =====================================================================
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { cancelSubscriptionsForAccountDeletion } from "../_shared/billing/cancellation.ts";
import { createSupabaseBillingStore } from "../_shared/billing/store.ts";
import { corsHeadersFor, isOriginBlocked, jsonResponse, sameSecret } from "../_shared/http.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBSCRIPTION_LIVE_CODE = "GA023";

/** Códigos do banco que viram resposta própria (o painel mostra a mensagem do ApiError). */
const DATABASE_ERRORS: Record<string, { status: number; code: string }> = {
  GA001: { status: 403, code: "staff_not_member" },
  GA002: { status: 403, code: "staff_mfa_required" },
  GA003: { status: 403, code: "staff_forbidden" },
  GA004: { status: 404, code: "account_not_found" },
  GA011: { status: 400, code: "reason_required" },
  GA014: { status: 400, code: "account_is_staff" },
  GA015: { status: 400, code: "account_has_files" },
  GA023: { status: 409, code: "account_has_subscription" },
};

interface StaffDeletion {
  userId: string;
  reason: string;
  note: string | null;
}

function parseStaffDeletion(raw: unknown): StaffDeletion | null {
  if (!raw || typeof raw !== "object") return null;
  const { userId, reason, note } = raw as Record<string, unknown>;
  if (typeof userId !== "string" || !UUID_PATTERN.test(userId) || typeof reason !== "string") return null;
  return { userId, reason, note: typeof note === "string" && note.trim() ? note.trim() : null };
}

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}

/** Cancela as assinaturas vivas no gateway. Sem resposta dele, nada é excluído (devolução não fica órfã). */
async function cancelSubscriptions(service: SupabaseClient, userId: string): Promise<boolean> {
  try {
    await cancelSubscriptionsForAccountDeletion(createSupabaseBillingStore(service), userId);
    return true;
  } catch (error) {
    console.error("Exclusão pelo painel: falha ao cancelar a assinatura", { message: (error as Error).message });
    return false;
  }
}

/** Excluir agora (painel): o banco confere tudo com o token do colaborador; assinatura viva → cancela e repete. */
async function deleteByStaff(req: Request, cors: Record<string, string>): Promise<Response> {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return jsonResponse({ code: "not_authenticated" }, 401, cors);
  const body = parseStaffDeletion(await req.json().catch(() => null));
  if (!body) return jsonResponse({ code: "unknown" }, 400, cors);

  const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const deleteAccount = () => caller.rpc("admin_delete_user", { p_user_id: body.userId, p_reason: body.reason, p_note: body.note });

  let { error } = await deleteAccount();
  if (error?.code === SUBSCRIPTION_LIVE_CODE) {
    if (!(await cancelSubscriptions(serviceClient(), body.userId))) return jsonResponse({ code: "billing_provider_error" }, 502, cors);
    ({ error } = await deleteAccount());
  }
  if (!error) return jsonResponse({ ok: true }, 200, cors);
  const mapped = DATABASE_ERRORS[error.code ?? ""];
  return mapped ? jsonResponse({ code: mapped.code }, mapped.status, cors) : jsonResponse({ code: "unknown" }, 500, cors);
}

/** Exclusão agendada vencida (chamada pelo banco): confere, cancela a assinatura e exclui. */
async function deleteScheduled(req: Request): Promise<Response> {
  const secret = Deno.env.get("ACCOUNT_CLOSURE_SECRET");
  if (!secret || !sameSecret(req.headers.get("x-guf-secret"), secret)) return jsonResponse({ error: "Não autorizado" }, 401);
  const raw = (await req.json().catch(() => null)) as { userId?: unknown } | null;
  const userId = typeof raw?.userId === "string" && UUID_PATTERN.test(raw.userId) ? raw.userId : null;
  if (!userId) return jsonResponse({ error: "Pedido inválido" }, 400);

  const service = serviceClient();
  const { data: isDue, error: dueError } = await service.rpc("is_account_deletion_due", { p_user_id: userId });
  if (dueError) return jsonResponse({ error: "Falha ao conferir a exclusão" }, 500);
  if (!isDue) return jsonResponse({ ok: false, reason: "not_due" });

  // Falhou: o job do banco chama de novo na próxima rodada (a mesma chave evita devolver duas vezes).
  if (!(await cancelSubscriptions(service, userId))) return jsonResponse({ error: "Gateway sem resposta" }, 502);
  const { error } = await service.rpc("execute_scheduled_deletion", { p_user_id: userId });
  if (error) {
    console.error("Exclusão agendada: falha ao excluir", { code: error.code });
    return jsonResponse({ error: "Falha ao excluir" }, 500);
  }
  return jsonResponse({ ok: true });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeadersFor(origin);
  if (isOriginBlocked(origin)) return jsonResponse({ code: "unknown" }, 403, cors);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return jsonResponse({ code: "unknown" }, 405, cors);

  return req.headers.has("x-guf-secret") ? deleteScheduled(req) : deleteByStaff(req, cors);
});
