"use client";

import { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { AiChatRequest, AiConversation } from "@guf/api";
import { aiThinkingLabel } from "@guf/core";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { useAiSource } from "@/features/ai/api/use-ai";
import { getAiPhase, getMessageText, getPendingToolName, toAiChatRequest, toUIMessages } from "@/features/ai/helpers/ai-messages";
import type { AiUIMessage } from "@/features/ai/type";

/** Atualiza a tela no máximo a cada 50 ms durante o stream (menos renderizações no celular). */
const STREAM_THROTTLE_MS = 50;

/**
 * Conversa com o GUF AI (useChat do AI SDK). O transporte manda à Edge Function só a pergunta nova
 * (packages/api → streamAiReply, com o token do usuário); o histórico o servidor lê do banco.
 */
export function useAiChat(conversation: AiConversation) {
  const { api } = useAiSource();

  const transport = useMemo(
    () =>
      new DefaultChatTransport<AiUIMessage>({
        // O endereço real é resolvido pelo cliente Supabase em `fetch` abaixo.
        api: "guf-ai",
        prepareSendMessagesRequest: ({ id, messages, trigger }) => ({ body: toAiChatRequest({ id, messages, trigger }) }),
        fetch: async (_url, init) => {
          const request = JSON.parse(String(init?.body)) as AiChatRequest;
          const { data, error } = await api.streamAiReply(getSupabaseClient(), { request, signal: init?.signal ?? undefined });
          if (error) throw new Error(error.message);
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
  });

  const last = chat.messages[chat.messages.length - 1];
  const phase = getAiPhase(chat.status, last);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || phase !== "idle") return;
    void chat.sendMessage({ text: trimmed });
  };

  /** Depois de um erro: refaz a resposta (havia resposta parcial) ou reenvia a mesma pergunta. */
  const retry = () => {
    if (!last) return;
    if (last.role === "assistant") return void chat.regenerate();
    void chat.sendMessage({ text: getMessageText(last), messageId: last.id });
  };

  return {
    messages: chat.messages,
    phase,
    thinkingLabel: aiThinkingLabel(phase === "thinking" && last?.role === "assistant" ? getPendingToolName(last) : null),
    error: chat.error ?? null,
    send,
    stop: () => void chat.stop(),
    regenerate: () => void chat.regenerate(),
    retry,
  };
}
