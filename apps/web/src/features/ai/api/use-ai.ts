"use client";

import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { aiApi, type AiApi, type AiConversation, type AiFeedback, type ApiError } from "@guf/api";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockAiApi } from "@/mocks/ai";

const AI_CONVERSATION_KEY = "ai-conversation";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado= (qualquer cenário da Início), o mock. */
export function useAiSource(): { api: AiApi; mock: boolean } {
  const scenario = useSearchParams().get("estado");
  if (process.env.NODE_ENV === "development" && scenario) return { api: mockAiApi, mock: true };
  return { api: aiApi, mock: false };
}

/** Conversa mais recente, lida ao abrir o GUF AI (sempre do servidor: a conversa não fica no aparelho). */
export function useLatestAiConversation(enabled: boolean) {
  const { api, mock } = useAiSource();
  return useQuery<AiConversation | null, ApiError>({
    queryKey: [AI_CONVERSATION_KEY, mock],
    enabled,
    staleTime: 0,
    // Nada da conversa fica em memória depois de fechar o painel (outra conta no mesmo aparelho).
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      const { data, error } = await api.getLatestAiConversation(getSupabaseClient(), null);
      if (error) throw error;
      return data;
    },
  });
}

/** Marca uma resposta como útil / não ajudou (null tira a marca). */
export function useAiFeedback() {
  const { api } = useAiSource();
  return useMutation<null, ApiError, { messageId: string; feedback: AiFeedback | null }>({
    mutationFn: async (input) => {
      const { error } = await api.setAiMessageFeedback(getSupabaseClient(), input);
      if (error) throw error;
      return null;
    },
  });
}
