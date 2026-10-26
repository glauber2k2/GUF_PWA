"use client";

import { useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { apiError, type AiChatRequest, type AiConversation } from "@guf/api";
import { aiThinkingPhrases } from "@guf/core";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { useAiSource } from "@/features/ai/api/use-ai";
import {
  getAiPhase,
  getMessageText,
  getPendingToolName,
  hasReplyContent,
  toAiChatRequest,
  toUIMessages,
} from "@/features/ai/helpers/ai-messages";
import { AiRequestError } from "@/features/ai/helpers/ai-request-error";
import type { AiUIMessage } from "@/features/ai/type";

/** Atualiza a tela no máximo a cada 50 ms durante o stream (menos renderizações no celular). */
const STREAM_THROTTLE_MS = 50;

/**
 * Conversa com o GUF AI (useChat do AI SDK). O transporte manda à Edge Function só a pergunta nova
 * (packages/api → streamAiReply, com o token do usuário); o histórico o servidor lê do banco.
 */
export function useAiChat(conversation: AiConversation) {
  const { api } = useAiSource();
  // Fim sem resposta e sem erro do stream (conexão caiu, resposta vazia): o useChat não acusa erro.
  const [silentEndError, setSilentEndError] = useState<AiRequestError | null>(null);
  const isStoppedByUser = useRef(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AiUIMessage>({
        // O endereço real é resolvido pelo cliente Supabase em `fetch` abaixo.
        api: "guf-ai",
        prepareSendMessagesRequest: ({ id, messages, trigger }) => ({ body: toAiChatRequest({ id, messages, trigger }) }),
        fetch: async (_url, init) => {
          const request = JSON.parse(String(init?.body)) as AiChatRequest;
          const { data, error } = await api.streamAiReply(getSupabaseClient(), { request, signal: init?.signal ?? undefined });
          if (error) throw new AiRequestError(error);
          return data;
        },
      }),
    [api],
  );

  const chat = useChat<AiUIMessage>({
    id: conversation.id,
    messages: toUIMessages(conversation.messages),
    transport,
    generateId: () => crypto.randomUUID(),
    experimental_throttle: STREAM_THROTTLE_MS,
    onFinish: ({ message, isError }) => {
      const wasStoppedByUser = isStoppedByUser.current;
      isStoppedByUser.current = false;
      if (isError || wasStoppedByUser || hasReplyContent(message)) return;
      setSilentEndError(new AiRequestError(apiError("ai_unavailable")));
    },
  });

  const last = chat.messages[chat.messages.length - 1];
  const phase = getAiPhase(chat.status, last);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle") return;
    setSilentEndError(null);
    void chat.sendMessage({ text: trimmed });
  };

  const regenerate = () => {
    setSilentEndError(null);
    void chat.regenerate();
  };

  /** Depois de um erro: refaz a resposta (havia resposta parcial) ou reenvia a mesma pergunta. */
  const retry = () => {
    if (!last) return;
    if (last.role === "assistant") return regenerate();
    setSilentEndError(null);
    void chat.sendMessage({ text: getMessageText(last), messageId: last.id });
  };

  const stop = () => {
    isStoppedByUser.current = true;
    void chat.stop();
  };

  return {
    messages: chat.messages,
    phase,
    thinkingPhrases: aiThinkingPhrases(phase === "thinking" && last?.role === "assistant" ? getPendingToolName(last) : null),
    error: chat.error ?? silentEndError,
    /** As perguntas do plano acabaram (outro plano libera mais): a tela oferece o Pro. */
    isPlanLimited: chat.error instanceof AiRequestError && chat.error.apiError.code === "plan_limit",
    send,
    stop,
    regenerate,
    retry,
  };
}
