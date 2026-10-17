"use client";

import { useQuery } from "@tanstack/react-query";
import { shareApi, type ApiError, type ShareApi } from "@guf/api";
import type { StoryData } from "@guf/core";
import { withDeviceCache } from "@/lib/offline/device-cache";
import { EVOLUTION_KEY } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { mockShareApi, setShareMockScenario } from "@/mocks/share";
import { useAuth } from "@/providers/auth-provider";

/**
 * Dados dos stories de um treino concluído (só ao abrir a folha). Fica sob a chave da Evolução:
 * finalizar/excluir treino invalida junto. Com cópia no aparelho (abre sem internet depois da 1ª vez).
 * `mockScenario` (só desenvolvimento): usa o mock com o mesmo contrato.
 */
export function useShareStory(sessionId: string | null, enabled: boolean, mockScenario?: string | null) {
  const { user } = useAuth();
  const mock = process.env.NODE_ENV === "development" && Boolean(mockScenario);
  const api: ShareApi = mock ? mockShareApi : shareApi;
  return useQuery<StoryData, ApiError>({
    queryKey: [EVOLUTION_KEY, "share", user?.id, sessionId, mock ? mockScenario : null],
    enabled: enabled && (mock || Boolean(user && sessionId)),
    queryFn: async () => {
      const id = sessionId ?? "demo";
      if (mock) {
        setShareMockScenario(mockScenario);
        const res = await api.getShareStoryData(getSupabaseClient(), { sessionId: id });
        if (res.error) throw res.error;
        return res.data;
      }
      const res = await withDeviceCache(`share:${id}`, () => api.getShareStoryData(getSupabaseClient(), { sessionId: id }));
      if (res.error) throw res.error;
      return res.data.value;
    },
  });
}
