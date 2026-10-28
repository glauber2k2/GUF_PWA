// Conversa do GUF AI (useChat → DefaultChatTransport):
//   1. grava a pergunta (conversa do próprio usuário, RLS);
//   2. entrega ao modelo só o histórico da conversa e ferramentas presas ao usuário (data-tools.ts e a
//      conversão de ficha, plan-import.ts), com o texto anonimizado (privacy.ts);
//   3. devolve a resposta em stream e grava a resposta no fim.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type ModelMessage,
} from "npm:ai@7.0.131";
import { buildDataTools, type WeightUnit } from "./data-tools.ts";
import { textResponse } from "./http.ts";
import { buildInstructions } from "./instructions.ts";
import { buildLanguageModel, THINKING_RESERVE_TOKENS } from "./model.ts";
import { buildPlanImportTool } from "./plan-import.ts";
import { redactPersonalData } from "./privacy.ts";
import { logProviderError, MAX_RETRIES, TIMEOUT, toProviderErrorMessage } from "./provider-errors.ts";
import { checkDailyQuota } from "./quota.ts";
import { guardEmptyReply } from "./reply-guard.ts";

// Mantido igual a packages/core/src/ai.ts (a Edge Function não importa os pacotes do monorepo).
const AI_MESSAGE_MAX_CHARS = 2000;
const HISTORY_MESSAGES = 20;
const TITLE_MAX_CHARS = 80;
const MAX_STEPS = 6;
// Texto da resposta + raciocínio do modelo (o provedor conta os dois no mesmo limite).
const MAX_OUTPUT_TOKENS = 1200 + THINKING_RESERVE_TOKENS;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ChatRequest {
  conversationId: string;
  trigger: "submit-message" | "regenerate-message";
  message?: { id: string; text: string };
}

/** Corpo enviado pelo app (packages/api/src/ai.ts → buildAiChatBody); null = inválido. */
function parseChatRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== "object") return null;
  const { conversationId, trigger, message } = body as Record<string, unknown>;
  if (typeof conversationId !== "string" || !UUID.test(conversationId)) return null;
  if (trigger === "regenerate-message") return { conversationId, trigger };
  if (trigger !== "submit-message" || !message || typeof message !== "object") return null;
  const { id, text } = message as Record<string, unknown>;
  if (typeof id !== "string" || !UUID.test(id) || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > AI_MESSAGE_MAX_CHARS) return null;
  return { conversationId, trigger, message: { id, text: trimmed } };
}

/** Data local do usuário (perfil) no formato AAAA-MM-DD. */
function localToday(timeZone: string | null): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timeZone ?? "America/Sao_Paulo" }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  }
}

/**
 * Grava a pergunta (cria a conversa na primeira) ou, ao gerar de novo, apaga a última resposta.
 * Reenvio da mesma pergunta ("Tentar de novo", mesmo id) não duplica e descarta a resposta parcial dela.
 */
async function recordTurn(db: SupabaseClient, userId: string, request: ChatRequest): Promise<boolean> {
  if (request.trigger === "regenerate-message") {
    const { data: last } = await db.from("ai_messages").select("id, role")
      .eq("conversation_id", request.conversationId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last?.role === "assistant") await db.from("ai_messages").delete().eq("id", last.id);
    return Boolean(last);
  }
  const message = request.message!;
  const { error: conversationError } = await db.from("ai_conversations")
    .upsert({ id: request.conversationId, user_id: userId, title: message.text.slice(0, TITLE_MAX_CHARS) }, { onConflict: "id", ignoreDuplicates: true });
  if (conversationError) return false;
  const { error } = await db.from("ai_messages").upsert(
    { id: message.id, conversation_id: request.conversationId, user_id: userId, role: "user", content: message.text },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) return false;
  const { data: saved } = await db.from("ai_messages").select("created_at").eq("id", message.id).maybeSingle();
  if (!saved) return false;
  await db.from("ai_messages").delete()
    .eq("conversation_id", request.conversationId).eq("role", "assistant").gt("created_at", saved.created_at);
  return true;
}

async function loadHistory(db: SupabaseClient, conversationId: string): Promise<ModelMessage[]> {
  const { data } = await db.from("ai_messages").select("role, content")
    .eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(HISTORY_MESSAGES);
  return ((data ?? []) as { role: "user" | "assistant"; content: string }[])
    .reverse()
    .map((m) => ({ role: m.role, content: redactPersonalData(m.content) }));
}

/** Última pergunta do histórico (também em "gerar de novo"), para a conversão de ficha. */
function latestUserText(history: ModelMessage[]): string {
  const last = history.findLast((m) => m.role === "user");
  return typeof last?.content === "string" ? last.content : "";
}

interface HandlerContext {
  db: SupabaseClient;
  userId: string;
  cors: Record<string, string>;
  signal: AbortSignal;
}

export async function handleChat(body: unknown, { db, userId, cors, signal }: HandlerContext): Promise<Response> {
  const request = parseChatRequest(body);
  if (!request) return textResponse(`Mensagem inválida. Escreva até ${AI_MESSAGE_MAX_CHARS} caracteres.`, 400, cors);

  // Vale também para "gerar de novo" (cada nova resposta custa uma chamada ao provedor).
  const quota = await checkDailyQuota(db, userId);
  if (!quota.allowed) return textResponse(quota.message, quota.status, cors);

  if (!(await recordTurn(db, userId, request))) return textResponse("Não foi possível salvar a conversa. Tente de novo.", 500, cors);

  // Independentes: em paralelo, para a resposta começar antes.
  const [{ data: profile }, history] = await Promise.all([
    db.from("profiles").select("weight_unit, timezone").eq("id", userId).maybeSingle(),
    loadHistory(db, request.conversationId),
  ]);
  const unit: WeightUnit = profile?.weight_unit === "lb" ? "lb" : "kg";
  const today = localToday(profile?.timezone ?? null);
  const model = buildLanguageModel();

  const result = streamText({
    model,
    instructions: buildInstructions(today, unit),
    messages: history,
    tools: {
      ...buildDataTools({ db, userId, unit, today }),
      ...buildPlanImportTool(latestUserText(history), { db, model, abortSignal: signal }),
    },
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT,
    onError: ({ error }) => logProviderError(error),
    temperature: 0.4,
    abortSignal: signal,
  });

  const uiStream = toUIMessageStream({
    stream: result.stream,
    generateMessageId: () => crypto.randomUUID(),
    // O raciocínio interno do modelo não vai para a tela (deixava a resposta parada em "pensando").
    sendReasoning: false,
    onError: toProviderErrorMessage,
    onEnd: async ({ responseMessage }) => {
      const text = responseMessage.parts
        .flatMap((part) => (part.type === "text" ? [part.text] : []))
        .join("")
        .trim();
      if (!text) return;
      const { error } = await db.from("ai_messages").insert({
        id: responseMessage.id,
        conversation_id: request.conversationId,
        user_id: userId,
        role: "assistant",
        content: text.slice(0, 12000),
        used_history: responseMessage.parts.some((part) => part.type.startsWith("tool-")),
      });
      if (error) console.error("GUF AI: resposta não gravada", { code: error.code });
    },
  });

  return createUIMessageStreamResponse({ headers: cors, stream: uiStream.pipeThrough(guardEmptyReply(signal)) });
}
