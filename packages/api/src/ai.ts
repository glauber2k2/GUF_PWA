import { FunctionsHttpError } from "@supabase/supabase-js";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiError, type ApiResult } from "./result";
import { currentUserId } from "./shared";

/* =====================================================================
 * Contrato — GUF AI. SÓ ONLINE.
 * A resposta vem da Edge Function guf-ai (stream do AI SDK), que lê só os dados do usuário logado.
 * As conversas ficam no banco (ai_conversations/ai_messages, RLS); o app lê, avalia e apaga.
 * ===================================================================== */

export type AiFeedback = 1 | -1;

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** A resposta consultou os dados de treino (selo "Usou seu histórico"). */
  usedHistory: boolean;
  feedback: AiFeedback | null;
}

export interface AiConversation {
  id: string;
  messages: AiMessage[];
}

/** Corpo enviado à Edge Function (a pergunta nova; o histórico o servidor lê do banco). */
export type AiChatRequest =
  | { conversationId: string; trigger: "submit-message"; message: { id: string; text: string } }
  | { conversationId: string; trigger: "regenerate-message" };

type Result<T = null> = Promise<ApiResult<T>>;

export interface AiApi {
  /** Conversa mais recente (para retomar ao abrir o GUF AI); null = nenhuma. */
  getLatestAiConversation: (client: GufClient, input: null) => Result<AiConversation | null>;
  /** Marca a resposta como útil (1), não ajudou (-1) ou tira a marca (null). */
  setAiMessageFeedback: (client: GufClient, input: { messageId: string; feedback: AiFeedback | null }) => Result;
  /** Envia a pergunta e devolve a resposta HTTP em stream (lida pelo transporte do AI SDK). */
  streamAiReply: (client: GufClient, input: { request: AiChatRequest; signal?: AbortSignal }) => Result<Response>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const AI_FUNCTION = "guf-ai";

/** Status da Edge Function → erro do app. */
function toAiError(status: number): ApiError {
  if (status === 401) return apiError("not_authenticated");
  if (status === 402) return { ...apiError("plan_limit"), feature: "guf_ai_daily_messages" };
  if (status === 429) return apiError("ai_daily_limit");
  if (status === 400) return apiError("ai_message_invalid");
  return apiError("ai_unavailable");
}

export const getLatestAiConversation: AiApi["getLatestAiConversation"] = async (client) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { data, error } = await client
      .from("ai_conversations")
      .select("id, ai_messages(id, role, content, used_history, feedback, created_at)")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: toApiError(error) };
    if (!data) return { data: null, error: null };
    const messages = [...data.ai_messages]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map<AiMessage>((m) => ({
        id: m.id,
        role: m.role === "user" ? "user" : "assistant",
        text: m.content,
        usedHistory: m.used_history,
        feedback: m.feedback === 1 || m.feedback === -1 ? m.feedback : null,
      }));
    return { data: { id: data.id, messages }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const setAiMessageFeedback: AiApi["setAiMessageFeedback"] = async (client, { messageId, feedback }) => {
  try {
    const { error } = await client.from("ai_messages").update({ feedback }).eq("id", messageId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const streamAiReply: AiApi["streamAiReply"] = async (client, { request, signal }) => {
  try {
    const { data, error } = await client.functions.invoke<Response>(AI_FUNCTION, { body: request, signal });
    if (error instanceof FunctionsHttpError) return { data: null, error: toAiError((error.context as Response).status) };
    if (error) return { data: null, error: toApiError(error) };
    if (!(data instanceof Response)) return { data: null, error: apiError("ai_unavailable") };
    return { data, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const aiApi = { getLatestAiConversation, setAiMessageFeedback, streamAiReply } satisfies AiApi;
