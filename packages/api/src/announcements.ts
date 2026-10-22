import { ANNOUNCEMENT_FORMATS, ANNOUNCEMENT_TONES, type AnnouncementEvent, type AppAnnouncement } from "@guf/core";
import type { GufClient } from "./client";
import { toApiError, type ApiResult } from "./result";

/* =====================================================================
 * Contrato — Comunicados no app (o painel publica; o app só recebe e marca).
 * O banco avalia o público de cada comunicado SÓ para quem pergunta: o app nunca recebe a regra
 * nem dados de outras pessoas. Mesmo contrato para o PWA e o futuro app nativo.
 * ===================================================================== */

type Result<T = null> = Promise<ApiResult<T>>;

export interface AnnouncementsApi {
  /** Comunicados que valem agora para a pessoa logada (já sem os vistos/fechados). */
  getMyAnnouncements: (client: GufClient) => Result<AppAnnouncement[]>;
  /** Visto, fechado ou tocou no botão (idempotente). */
  markAnnouncement: (client: GufClient, input: { id: string; event: AnnouncementEvent }) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

export const getMyAnnouncements: AnnouncementsApi["getMyAnnouncements"] = async (client) => {
  try {
    const { data, error } = await client.rpc("my_announcements");
    if (error) return { data: null, error: toApiError(error) };
    const items = (data ?? [])
      .filter((row) => row.format in ANNOUNCEMENT_FORMATS && row.tone in ANNOUNCEMENT_TONES)
      .map(
        (row): AppAnnouncement => ({
          id: row.id,
          format: row.format as AppAnnouncement["format"],
          tone: row.tone as AppAnnouncement["tone"],
          title: row.title,
          body: row.body,
          ctaLabel: row.cta_label,
          ctaPath: row.cta_path,
          priority: row.priority,
          publishedAt: row.published_at,
        }),
      );
    return { data: items, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const markAnnouncement: AnnouncementsApi["markAnnouncement"] = async (client, { id, event }) => {
  try {
    const { error } = await client.rpc("mark_announcement", { p_id: id, p_event: event });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const announcementsApi = { getMyAnnouncements, markAnnouncement } satisfies AnnouncementsApi;
