"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError, ApiResult } from "@guf/api";
import type { AdminAnnouncement, AdminAnnouncementSummary, AnnouncementDraft } from "@guf/api/admin";
import type { Audience } from "@guf/core";
import { unwrap } from "@/shared/helpers/unwrap";
import { useAdminApi } from "@/shared/libs/admin-api";
import { ANNOUNCEMENTS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

export function useAnnouncementList() {
  const { apis, mockKey } = useAdminApi();
  return useQuery<AdminAnnouncementSummary[], ApiError>({
    queryKey: [ANNOUNCEMENTS_KEY, "list", mockKey],
    queryFn: () => unwrap(apis.announcements.listAnnouncements(getSupabaseClient())),
  });
}

export function useAnnouncement(id: string | null) {
  const { apis, mockKey } = useAdminApi();
  return useQuery<AdminAnnouncement, ApiError>({
    queryKey: [ANNOUNCEMENTS_KEY, "detail", id, mockKey],
    enabled: Boolean(id),
    queryFn: () => unwrap(apis.announcements.getAnnouncement(getSupabaseClient(), id as string)),
  });
}

/** Alcance estimado (só o número; a regra é avaliada no banco). */
export function useAudienceReach(audience: Audience, targetIds: string[]) {
  const { apis, mockKey } = useAdminApi();
  return useQuery<number, ApiError>({
    queryKey: [ANNOUNCEMENTS_KEY, "reach", audience, targetIds.length, targetIds[0] ?? null, mockKey],
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: () => unwrap(apis.announcements.countAudience(getSupabaseClient(), { audience, targetIds })),
  });
}

function useAnnouncementMutation<TInput, TOutput>(run: (input: TInput) => Promise<ApiResult<TOutput>>) {
  const queryClient = useQueryClient();
  return useMutation<TOutput, ApiError, TInput>({
    mutationFn: (input) => unwrap(run(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [ANNOUNCEMENTS_KEY] }),
  });
}

export function useSaveAnnouncement() {
  const { apis } = useAdminApi();
  return useAnnouncementMutation((input: { id: string | null; draft: AnnouncementDraft; targetIds: string[] }) =>
    apis.announcements.saveAnnouncement(getSupabaseClient(), input),
  );
}

export function usePublishAnnouncement() {
  const { apis } = useAdminApi();
  return useAnnouncementMutation((id: string) => apis.announcements.publishAnnouncement(getSupabaseClient(), id));
}

export function useEndAnnouncement() {
  const { apis } = useAdminApi();
  return useAnnouncementMutation((id: string) => apis.announcements.endAnnouncement(getSupabaseClient(), id));
}

export function useDuplicateAnnouncement() {
  const { apis } = useAdminApi();
  return useAnnouncementMutation((id: string) => apis.announcements.duplicateAnnouncement(getSupabaseClient(), id));
}
