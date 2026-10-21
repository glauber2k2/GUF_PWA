// =====================================================================
// GUF APP · Edge Function · GUF AI (perguntas sobre os próprios treinos)
// Chamada pelo app com o token do usuário (useChat → DefaultChatTransport). A função:
//   1. valida o token e o limite diário;
//   2. grava a pergunta (conversa do próprio usuário, RLS);
//   3. entrega ao modelo só o histórico da conversa e ferramentas de leitura presas ao usuário
//      (data-tools.ts), com o texto anonimizado (privacy.ts);
//   4. devolve a resposta em stream e grava a resposta no fim.
// Publicar: npx supabase functions deploy guf-ai --use-api
// Secrets: GOOGLE_GENERATIVE_AI_API_KEY, GUF_AI_MODEL (opcional), ALLOWED_ORIGINS (o mesmo da delete-account).
// LGPD: nada do conteúdo das conversas vai para os logs.
// =====================================================================
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  type ModelMessage,
} from "npm:ai@7.0.131";
import { buildDataTools, type WeightUnit } from "./data-tools.ts";
import { buildInstructions } from "./instructions.ts";
import { buildLanguageModel } from "./model.ts";
import { redactPersonalData } from "./privacy.ts";

// Mantidos iguais a packages/core/src/ai.ts (a Edge Function não importa os pacotes do monorepo).
const AI_DAILY_MESSAGE_LIMIT = 40;
const AI_MESSAGE_MAX_CHARS = 2000;
const HISTORY_MESSAGES = 20;
const TITLE_MAX_CHARS = 80;
const MAX_STEPS = 6;
const MAX_OUTPUT_TOKENS = 1200;
const DAY_MS = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allow = allowedOrigins.length === 0 ? "*" : origin && allowedOrigins.includes(origin) ? origin : null;
  return {
    ...(allow ? { "Access-Control-Allow-Origin": allow } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, user-agent",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

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

// Uma nova tentativa só: no plano gratuito o provedor responde 429 pedindo para esperar quase um
// minuto, e várias esperas estouravam o tempo da função com a tela parada em "pensando".
const MAX_RETRIES = 1;
const TIMEOUT = { totalMs: 60_000, firstChunkMs: 30_000 };

interface ProviderError {
  name?: string;
  statusCode?: number;
  message?: string;
  lastError?: unknown;
  cause?: unknown;
}

/** Erro do provedor por baixo dos invólucros do AI SDK (RetryError.lastError, cause). */
function unwrapProviderError(error: unknown): ProviderError {
  let current = (error ?? {}) as ProviderError;
  for (let depth = 0; depth < 3 && current.statusCode === undefined; depth++) {
    const inner = (current.lastError ?? current.cause) as ProviderError | undefined;
    if (!inner) break;
    current = inner;
  }
  return current;
}

/** Mensagem para o app, com o código do provedor para diagnóstico (nada da conversa). */
function toChatErrorMessage(error: unknown): string {
  const { statusCode, name } = unwrapProviderError(error);
  if (statusCode === 429) return "O GUF AI está muito procurado agora. Tente de novo em alguns minutos. (código 429)";
  const code = statusCode ?? name ?? "desconhecido";
  return `O GUF AI não conseguiu responder agora. Tente de novo em instantes. (código ${code})`;
}

/** Log do erro sem conteúdo da conversa: tipo, status e o começo da mensagem do provedor. */
function logProviderError(error: unknown) {
  const { name, statusCode, message } = unwrapProviderError(error);
  console.error("GUF AI: falha do provedor", { name, statusCode, message: message?.slice(0, 300) });
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = corsHeadersFor(origin);
  // Texto puro: o transporte do AI SDK mostra o corpo da resposta como mensagem de erro.
  const fail = (message: string, status: number) =>
    new Response(message, { status, headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } });

  if (origin && allowedOrigins.length > 0 && !allowedOrigins.includes(origin)) {
    return fail("Origem não autorizada.", 403);
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Método não permitido.", 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return fail("Entre na sua conta para usar o GUF AI.", 401);

  // Cliente com o token do usuário: toda leitura e gravação passa pelo RLS dele.
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user } } = await db.auth.getUser(authorization.replace("Bearer ", ""));
  if (!user) return fail("Sua sessão expirou. Entre de novo para usar o GUF AI.", 401);

  const request = parseChatRequest(await req.json().catch(() => null));
  if (!request) return fail(`Mensagem inválida. Escreva até ${AI_MESSAGE_MAX_CHARS} caracteres.`, 400);

  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count } = await db.from("ai_messages").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("role", "user").gte("created_at", since);
  // Vale também para "gerar de novo" (cada nova resposta custa uma chamada ao provedor).
  if ((count ?? 0) >= AI_DAILY_MESSAGE_LIMIT) {
    return fail(`Você chegou ao limite de ${AI_DAILY_MESSAGE_LIMIT} perguntas em 24 horas. Tente de novo mais tarde.`, 429);
  }

  if (!(await recordTurn(db, user.id, request))) return fail("Não foi possível salvar a conversa. Tente de novo.", 500);

  const { data: profile } = await db.from("profiles").select("weight_unit, timezone").eq("id", user.id).maybeSingle();
  const unit: WeightUnit = profile?.weight_unit === "lb" ? "lb" : "kg";
  const today = localToday(profile?.timezone ?? null);

  const result = streamText({
    model: buildLanguageModel(),
    instructions: buildInstructions(today, unit),
    messages: await loadHistory(db, request.conversationId),
    tools: buildDataTools({ db, userId: user.id, unit, today }),
    stopWhen: isStepCount(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    maxRetries: MAX_RETRIES,
    timeout: TIMEOUT,
    onError: ({ error }) => logProviderError(error),
    temperature: 0.4,
    abortSignal: req.signal,
  });

  return createUIMessageStreamResponse({
    headers: corsHeaders,
    stream: toUIMessageStream({
      stream: result.stream,
      generateMessageId: () => crypto.randomUUID(),
      // O raciocínio interno do modelo não vai para a tela (deixava a resposta parada em "pensando").
      sendReasoning: false,
      onError: toChatErrorMessage,
      onEnd: async ({ responseMessage }) => {
        const text = responseMessage.parts
          .flatMap((part) => (part.type === "text" ? [part.text] : []))
          .join("")
          .trim();
        if (!text) return;
        const { error } = await db.from("ai_messages").insert({
          id: responseMessage.id,
          conversation_id: request.conversationId,
          user_id: user.id,
          role: "assistant",
          content: text.slice(0, 12000),
          used_history: responseMessage.parts.some((part) => part.type.startsWith("tool-")),
        });
        if (error) console.error("GUF AI: resposta não gravada", { code: error.code });
      },
    }),
  });
});
