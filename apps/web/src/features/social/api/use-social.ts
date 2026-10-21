"use client";

import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SOCIAL_SEARCH_MIN_LENGTH, normalizeHandle } from "@guf/core";
import {
  socialApi,
  type ApiError,
  type ConnectionKind,
  type FollowStatus,
  type MemberWorkoutDetail,
  type SocialApi,
  type SocialSettings,
} from "@guf/api";
import { invalidateSocialData, SOCIAL_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockSocialApi, setSocialMockScenario } from "@/mocks/social";
import { useAuth } from "@/features/auth";
import { useDevSocialState, type DevSocialState } from "@/features/social/hooks/use-dev-social-state";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";

/** Treinos por página no histórico do perfil. */
export const MEMBER_WORKOUTS_PAGE = 10;

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (mesmo contrato). */
export function useSocialSource(): { api: SocialApi; dev: DevSocialState } {
  const dev = useDevSocialState();
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setSocialMockScenario(dev.scenario);
    return { api: mockSocialApi, dev };
  }
  return { api: socialApi, dev };
}

/** Seguir, aceitar e alterar privacidade exigem internet. */
export function useCanUseSocial(): boolean {
  const online = useOnlineStatus();
  const { dev } = useSocialSource();
  return online && !dev.forceOffline;
}

function unwrap<T>(result: { data: T; error: null } | { data: null; error: ApiError }): T {
  if (result.error) throw result.error;
  return result.data as T;
}

export function useMySocial() {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  return useQuery({
    queryKey: [SOCIAL_KEY, "me", user?.id, dev.scenario],
    enabled: Boolean(user) || dev.scenario !== null,
    queryFn: async () => unwrap(await api.getMySocial(getSupabaseClient())),
  });
}

/** Perfil de uma pessoa (null = o seu). */
export function useMemberProfile(userId: string | null) {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  return useQuery({
    queryKey: [SOCIAL_KEY, "profile", user?.id, userId, dev.scenario],
    enabled: Boolean(user) || dev.scenario !== null,
    queryFn: async () => unwrap(await api.getMemberProfile(getSupabaseClient(), userId)),
  });
}

export function useMemberEvolution(userId: string | null, weeks: number, enabled: boolean) {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  return useQuery({
    queryKey: [SOCIAL_KEY, "evolution", user?.id, userId, weeks, dev.scenario],
    enabled: (Boolean(user) || dev.scenario !== null) && enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.getMemberEvolution(getSupabaseClient(), { userId, weeks })),
  });
}

/** Histórico de treinos paginado pelo fim do último treino carregado. */
export function useMemberWorkouts(userId: string | null, enabled: boolean) {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  return useInfiniteQuery({
    queryKey: [SOCIAL_KEY, "workouts", user?.id, userId, dev.scenario],
    enabled: (Boolean(user) || dev.scenario !== null) && enabled,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) =>
      unwrap(await api.listMemberWorkouts(getSupabaseClient(), { userId, before: pageParam, limit: MEMBER_WORKOUTS_PAGE })),
    getNextPageParam: (page) => (page.length === MEMBER_WORKOUTS_PAGE ? (page.at(-1)?.finishedAt ?? null) : null),
  });
}

/** Treino concluído de outra pessoa (só online; a permissão é conferida no banco). */
export function useMemberWorkout(sessionId: string | null) {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  return useQuery<MemberWorkoutDetail, ApiError>({
    queryKey: [SOCIAL_KEY, "workout", user?.id, sessionId, dev.scenario],
    enabled: (Boolean(user) || dev.scenario !== null) && Boolean(sessionId),
    queryFn: async () => unwrap(await api.getMemberWorkout(getSupabaseClient(), { sessionId: sessionId ?? "" })),
  });
}

export function useConnections(kind: ConnectionKind, userId: string | null) {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  return useQuery({
    queryKey: [SOCIAL_KEY, "connections", user?.id, kind, userId, dev.scenario],
    enabled: Boolean(user) || dev.scenario !== null,
    queryFn: async () => unwrap(await api.listConnections(getSupabaseClient(), { kind, userId })),
  });
}

export function usePeopleSearch(query: string) {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  const term = query.trim();
  return useQuery({
    queryKey: [SOCIAL_KEY, "search", user?.id, term.toLowerCase(), dev.scenario],
    enabled: (Boolean(user) || dev.scenario !== null) && normalizeHandle(term).length >= SOCIAL_SEARCH_MIN_LENGTH,
    placeholderData: keepPreviousData,
    queryFn: async () => unwrap(await api.searchPeople(getSupabaseClient(), term)),
  });
}

/** Id da pessoa pelo @ do link de convite. */
export function usePersonByHandle(handle: string | null) {
  const { user } = useAuth();
  const { api, dev } = useSocialSource();
  return useQuery({
    queryKey: [SOCIAL_KEY, "handle", user?.id, handle, dev.scenario],
    enabled: Boolean((user || dev.scenario !== null) && handle),
    queryFn: async () => unwrap(await api.findByHandle(getSupabaseClient(), handle ?? "")),
  });
}

/** Todas as gravações do módulo: no fim, perfis, listas e competição recarregam. */
function useSocialMutation<Input, Output = null>(run: (api: SocialApi, input: Input) => ReturnType<SocialApi[keyof SocialApi]>) {
  const queryClient = useQueryClient();
  const { api } = useSocialSource();
  return useMutation<Output, ApiError, Input>({
    mutationFn: async (input) => unwrap((await run(api, input)) as { data: Output; error: null } | { data: null; error: ApiError }),
    onSettled: () => invalidateSocialData(queryClient),
  });
}

export function useRequestFollow() {
  return useSocialMutation<string, FollowStatus>((api, userId) => api.requestFollow(getSupabaseClient(), userId));
}

export function useUnfollow() {
  return useSocialMutation<string>((api, userId) => api.unfollow(getSupabaseClient(), userId));
}

export function useRespondFollowRequest() {
  return useSocialMutation<{ userId: string; accept: boolean }>((api, input) => api.respondFollowRequest(getSupabaseClient(), input));
}

export function useRemoveFollower() {
  return useSocialMutation<string>((api, userId) => api.removeFollower(getSupabaseClient(), userId));
}

export function useBlockUser() {
  return useSocialMutation<string>((api, userId) => api.blockUser(getSupabaseClient(), userId));
}

export function useUnblockUser() {
  return useSocialMutation<string>((api, userId) => api.unblockUser(getSupabaseClient(), userId));
}

export function useUpdateSocialSettings() {
  return useSocialMutation<SocialSettings>((api, input) => api.updateSettings(getSupabaseClient(), input));
}

export function useUpdateHandle() {
  return useSocialMutation<string>((api, handle) => api.updateHandle(getSupabaseClient(), handle));
}
