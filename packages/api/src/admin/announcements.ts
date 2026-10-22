import {
  AUDIENCE_ALL,
  type Audience,
  type AnnouncementFormat,
  type AnnouncementFrequency,
  type AnnouncementPurpose,
  type AnnouncementState,
  type AnnouncementTone,
} from "@guf/core";
import { audienceSchema } from "@guf/schemas";
import type { Json } from "@guf/types";
import type { GufClient } from "../client";
import type { ApiResult } from "../result";
import { runQuery } from "./run-query";

/* =====================================================================
 * Contrato — Comunicados no painel (criar rascunho, alcance, publicar, encerrar, duplicar).
 * O público é conferido de novo no banco (validação e regra de consentimento de saúde); o alcance
 * volta só como número. Publicado não se edita: encerre e duplique.
 * ===================================================================== */

export interface AnnouncementDraft {
  title: string;
  body: string;
  format: AnnouncementFormat;
  tone: AnnouncementTone;
  ctaLabel: string | null;
  ctaPath: string | null;
  audience: Audience;
  purpose: AnnouncementPurpose;
  priority: number;
  frequency: AnnouncementFrequency;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AnnouncementStats {
  reachEstimate: number | null;
  seenCount: number;
  dismissedCount: number;
  ctaCount: number;
}

export interface AdminAnnouncementSummary extends AnnouncementStats {
  id: string;
  title: string;
  tone: AnnouncementTone;
  format: AnnouncementFormat;
  audience: Audience;
  purpose: AnnouncementPurpose;
  state: AnnouncementState;
  startsAt: string | null;
  endsAt: string | null;
  targetsCount: number;
  updatedAt: string;
}

export interface AdminAnnouncement extends AnnouncementStats {
  id: string;
  draft: AnnouncementDraft;
  state: AnnouncementState;
  targetIds: string[];
  publishedAt: string | null;
  publishedByName: string | null;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface AnnouncementsAdminApi {
  listAnnouncements: (client: GufClient) => Result<AdminAnnouncementSummary[]>;
  getAnnouncement: (client: GufClient, id: string) => Result<AdminAnnouncement>;
  /** Cria (id nulo) ou atualiza o rascunho; ids que não existem são ignorados e contados. */
  saveAnnouncement: (
    client: GufClient,
    input: { id: string | null; draft: AnnouncementDraft; targetIds: string[] },
  ) => Result<{ id: string; targetsFound: number; targetsIgnored: number }>;
  countAudience: (client: GufClient, input: { audience: Audience; targetIds: string[] }) => Result<number>;
  publishAnnouncement: (client: GufClient, id: string) => Result;
  endAnnouncement: (client: GufClient, id: string) => Result;
  duplicateAnnouncement: (client: GufClient, id: string) => Result<string>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

function toAudience(value: unknown): Audience {
  const parsed = audienceSchema.safeParse(value);
  return parsed.success ? parsed.data : AUDIENCE_ALL;
}

function toDraftRow(draft: AnnouncementDraft): Json {
  return {
    title: draft.title,
    body: draft.body,
    format: draft.format,
    tone: draft.tone,
    cta_label: draft.ctaLabel,
    cta_path: draft.ctaPath,
    audience: draft.audience as unknown as Json,
    purpose: draft.purpose,
    priority: draft.priority,
    frequency: draft.frequency,
    starts_at: draft.startsAt,
    ends_at: draft.endsAt,
  };
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  format: AnnouncementFormat;
  tone: AnnouncementTone;
  cta_label: string | null;
  cta_path: string | null;
  audience: unknown;
  purpose: AnnouncementPurpose;
  priority: number;
  frequency: AnnouncementFrequency;
  starts_at: string | null;
  ends_at: string | null;
  state: AnnouncementState;
  reach_estimate: number | null;
  seen_count: number;
  dismissed_count: number;
  cta_count: number;
  target_ids: string[];
  published_at: string | null;
  published_by_name: string | null;
}

export const listAnnouncements: AnnouncementsAdminApi["listAnnouncements"] = async (client) => {
  const result = await runQuery(() => client.rpc("admin_list_announcements"));
  if (result.error) return result;
  return {
    data: (result.data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      tone: r.tone as AnnouncementTone,
      format: r.format as AnnouncementFormat,
      audience: toAudience(r.audience),
      purpose: r.purpose as AnnouncementPurpose,
      state: r.state as AnnouncementState,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      reachEstimate: r.reach_estimate,
      seenCount: r.seen_count,
      dismissedCount: r.dismissed_count,
      ctaCount: r.cta_count,
      targetsCount: r.targets_count,
      updatedAt: r.updated_at,
    })),
    error: null,
  };
};

export const getAnnouncement: AnnouncementsAdminApi["getAnnouncement"] = async (client, id) => {
  const result = await runQuery(() => client.rpc("admin_get_announcement", { p_id: id }));
  if (result.error) return result;
  const r = result.data as unknown as AnnouncementRow;
  return {
    data: {
      id: r.id,
      state: r.state,
      targetIds: r.target_ids,
      reachEstimate: r.reach_estimate,
      seenCount: Number(r.seen_count),
      dismissedCount: Number(r.dismissed_count),
      ctaCount: Number(r.cta_count),
      publishedAt: r.published_at,
      publishedByName: r.published_by_name,
      draft: {
        title: r.title,
        body: r.body,
        format: r.format,
        tone: r.tone,
        ctaLabel: r.cta_label,
        ctaPath: r.cta_path,
        audience: toAudience(r.audience),
        purpose: r.purpose,
        priority: r.priority,
        frequency: r.frequency,
        startsAt: r.starts_at,
        endsAt: r.ends_at,
      },
    },
    error: null,
  };
};

export const saveAnnouncement: AnnouncementsAdminApi["saveAnnouncement"] = async (client, { id, draft, targetIds }) => {
  const result = await runQuery(() =>
    client.rpc("admin_save_announcement", { p_id: id as string, p_draft: toDraftRow(draft), p_target_ids: targetIds }),
  );
  if (result.error) return result;
  const r = result.data as { id: string; targets_found: number; targets_ignored: number };
  return { data: { id: r.id, targetsFound: r.targets_found, targetsIgnored: r.targets_ignored }, error: null };
};

export const countAudience: AnnouncementsAdminApi["countAudience"] = async (client, { audience, targetIds }) => {
  const result = await runQuery(() =>
    client.rpc("admin_audience_count", { p_audience: audience as unknown as Json, p_target_ids: targetIds }),
  );
  return result.error ? result : { data: result.data ?? 0, error: null };
};

export const publishAnnouncement: AnnouncementsAdminApi["publishAnnouncement"] = async (client, id) => {
  const result = await runQuery(() => client.rpc("admin_publish_announcement", { p_id: id }));
  return result.error ? result : { data: null, error: null };
};

export const endAnnouncement: AnnouncementsAdminApi["endAnnouncement"] = async (client, id) => {
  const result = await runQuery(() => client.rpc("admin_end_announcement", { p_id: id }));
  return result.error ? result : { data: null, error: null };
};

export const duplicateAnnouncement: AnnouncementsAdminApi["duplicateAnnouncement"] = async (client, id) => {
  const result = await runQuery(() => client.rpc("admin_duplicate_announcement", { p_id: id }));
  return result.error ? result : { data: result.data ?? "", error: null };
};

export const announcementsAdminApi = {
  listAnnouncements,
  getAnnouncement,
  saveAnnouncement,
  countAudience,
  publishAnnouncement,
  endAnnouncement,
  duplicateAnnouncement,
} satisfies AnnouncementsAdminApi;
