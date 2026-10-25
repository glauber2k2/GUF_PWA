"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError, ApiResult } from "@guf/api";
import type { AdminUserDetail, HandleAvailability, ReasonInput } from "@guf/api/admin";
import { unwrap } from "@/shared/helpers/unwrap";
import { useAdminApi } from "@/shared/libs/admin-api";
import { PEOPLE_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

/**
 * Resumo da conta. Cada abertura fica na auditoria (no banco); por isso não recarrega sozinho ao
 * voltar para a aba, só quando a equipe muda algo.
 */
export function usePerson(userId: string | null) {
  const { apis, mockKey } = useAdminApi();
  return useQuery<AdminUserDetail, ApiError>({
    queryKey: [PEOPLE_KEY, "detail", userId, mockKey],
    enabled: Boolean(userId),
    staleTime: Infinity,
    queryFn: () => unwrap(apis.users.getUser(getSupabaseClient(), userId as string)),
  });
}

/** Disponibilidade do novo @ enquanto digita (o banco confere de novo ao salvar). */
export function useHandleAvailability(userId: string, handle: string, enabled: boolean) {
  const { apis, mockKey } = useAdminApi();
  return useQuery<HandleAvailability, ApiError>({
    queryKey: [PEOPLE_KEY, "handle", userId, handle, mockKey],
    enabled: enabled && handle.trim().length > 0,
    staleTime: 10_000,
    queryFn: () => unwrap(apis.users.checkHandle(getSupabaseClient(), { userId, handle })),
  });
}

/** Mostra o e-mail completo (fica na auditoria). Não vai para o cache: some ao fechar a conta. */
export function useRevealEmail() {
  const { apis } = useAdminApi();
  return useMutation<string, ApiError, string>({ mutationFn: (userId) => unwrap(apis.users.revealEmail(getSupabaseClient(), userId)) });
}

function useAccountMutation<TInput extends { userId: string }>(run: (input: TInput) => Promise<ApiResult<null>>) {
  const queryClient = useQueryClient();
  return useMutation<null, ApiError, TInput>({
    mutationFn: (input) => unwrap(run(input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [PEOPLE_KEY] }),
  });
}

export function useUpdateHandle() {
  const { apis } = useAdminApi();
  return useAccountMutation((input: ReasonInput & { userId: string; handle: string }) => apis.users.updateHandle(getSupabaseClient(), input));
}

export function useUpdateName() {
  const { apis } = useAdminApi();
  return useAccountMutation((input: ReasonInput & { userId: string; name: string }) => apis.users.updateName(getSupabaseClient(), input));
}

export function useSetPlan() {
  const { apis } = useAdminApi();
  return useAccountMutation((input: ReasonInput & { userId: string; planCode: string; validUntil: string | null; notify: boolean }) =>
    apis.users.setPlan(getSupabaseClient(), input),
  );
}

export function useUnlinkLogin() {
  const { apis } = useAdminApi();
  return useAccountMutation((input: { userId: string; provider: string; note: string }) => apis.users.unlinkLogin(getSupabaseClient(), input));
}
