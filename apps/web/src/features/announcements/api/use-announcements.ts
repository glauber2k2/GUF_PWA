"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { nextAnnouncements, type AnnouncementEvent, type AnnouncementQueue, type AppAnnouncement } from "@guf/core";
import { announcementsApi, type AnnouncementsApi, type ApiError } from "@guf/api";
import { useAuth } from "@/features/auth";
import { mockAnnouncementsApi, setAnnouncementsMockScenario } from "@/mocks/announcements";
import { ANNOUNCEMENTS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { useDevAnnouncementsScenario } from "@/features/announcements/hooks/use-dev-announcements-state";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=aviso-…, o mock (mesmo contrato). */
function useAnnouncementsSource(): { api: AnnouncementsApi; scenario: string | null } {
  const scenario = useDevAnnouncementsScenario();
  if (process.env.NODE_ENV === "development" && scenario) {
    setAnnouncementsMockScenario(scenario);
    return { api: mockAnnouncementsApi, scenario };
  }
  return { api: announcementsApi, scenario: null };
}

/** Releitura no máximo a cada 5 min (ao abrir e ao voltar para o app). */
const ANNOUNCEMENTS_STALE_MS = 5 * 60_000;

/** Fila de comunicados desta abertura (no máximo 1 que interrompe, 2 que não interrompem). */
export function useAnnouncementQueue(): AnnouncementQueue | null {
  const { api, scenario } = useAnnouncementsSource();
  const { user } = useAuth();
  const query = useQuery<AppAnnouncement[], ApiError>({
    queryKey: [ANNOUNCEMENTS_KEY, user?.id ?? null, scenario],
    enabled: Boolean(user) || Boolean(scenario),
    staleTime: ANNOUNCEMENTS_STALE_MS,
    queryFn: async () => {
      const { data, error } = await api.getMyAnnouncements(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
  return query.data ? nextAnnouncements(query.data) : null;
}

/**
 * Marca visto, fechado ou botão. Fechado e botão tiram o aviso da tela na hora (o banco não o
 * devolve mais); falha de rede não incomoda: o aviso volta na próxima abertura.
 */
export function useMarkAnnouncement() {
  const { api } = useAnnouncementsSource();
  const queryClient = useQueryClient();
  return useCallback(
    (id: string, event: AnnouncementEvent) => {
      if (event !== "seen") {
        queryClient.setQueriesData<AppAnnouncement[]>({ queryKey: [ANNOUNCEMENTS_KEY] }, (items) => items?.filter((a) => a.id !== id));
      }
      void api.markAnnouncement(getSupabaseClient(), { id, event });
    },
    [api, queryClient],
  );
}
