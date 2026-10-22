// Pedido de conversão de ficha fora do chat (botão "Importar ficha" em Projetos): { kind: "plan-import", text }.
// Responde o rascunho em JSON; conta como um uso do limite diário do GUF AI.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { jsonResponse, textResponse } from "./http.ts";
import { buildLanguageModel } from "./model.ts";
import { convertTrainingPlan, PLAN_IMPORT_MAX_CHARS } from "./plan-import.ts";
import { logProviderError, toProviderErrorMessage } from "./provider-errors.ts";
import { checkDailyQuota } from "./quota.ts";

export interface PlanImportBody {
  kind: "plan-import";
  text: unknown;
}

export function isPlanImportBody(body: unknown): body is PlanImportBody {
  return Boolean(body) && typeof body === "object" && (body as { kind?: unknown }).kind === "plan-import";
}

interface HandlerContext {
  db: SupabaseClient;
  userId: string;
  cors: Record<string, string>;
  signal: AbortSignal;
}

export async function handlePlanImport(body: PlanImportBody, { db, userId, cors, signal }: HandlerContext): Promise<Response> {
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > PLAN_IMPORT_MAX_CHARS) {
    return textResponse(`Cole a ficha com até ${PLAN_IMPORT_MAX_CHARS} caracteres.`, 400, cors);
  }

  const quota = await checkDailyQuota(db, userId);
  if (!quota.allowed) return textResponse(quota.message, quota.status, cors);
  // Registrado antes de chamar o provedor (como a pergunta do chat): pedidos em paralelo não furam o limite.
  const { error: usageError } = await db.from("ai_plan_imports").insert({ user_id: userId });
  if (usageError) return textResponse("Não foi possível registrar o pedido. Tente de novo.", 500, cors);

  try {
    const draft = await convertTrainingPlan(text, { db, model: buildLanguageModel(), abortSignal: signal });
    if (!draft) return textResponse("Não encontramos exercícios nesse texto.", 422, cors);
    return jsonResponse(draft, cors);
  } catch (error) {
    logProviderError(error);
    return textResponse(toProviderErrorMessage(error), 503, cors);
  }
}
