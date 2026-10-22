"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@guf/api";
import type { StaffAccess, TotpEnrollment } from "@guf/api/admin";
import { useAdminApi } from "@/shared/libs/admin-api";
import { STAFF_ACCESS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** Em que passo do acesso a pessoa está (o banco responde; o painel só segue). */
export function useStaffAccess() {
  const { apis, mockKey } = useAdminApi();
  return useQuery<StaffAccess, ApiError>({
    queryKey: [STAFF_ACCESS_KEY, mockKey],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await apis.session.getStaffAccess(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

function useAccessMutation<TInput>(run: (input: TInput) => Promise<{ error: ApiError | null }>) {
  const queryClient = useQueryClient();
  return useMutation<null, ApiError, TInput>({
    mutationFn: async (input) => {
      const { error } = await run(input);
      if (error) throw error;
      return null;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [STAFF_ACCESS_KEY] }),
  });
}

export function useSignIn() {
  const { apis } = useAdminApi();
  return useAccessMutation((input: { email: string; password: string }) => apis.session.signIn(getSupabaseClient(), input));
}

/** Vai para o Google (a volta cai em /entrar, onde o código vira sessão). */
export function useGoogleSignIn() {
  const { apis } = useAdminApi();
  return useMutation<null, ApiError, string>({
    mutationFn: async (redirectTo) => {
      const { data, error } = await apis.session.signInWithGoogle(getSupabaseClient(), { redirectTo });
      if (error) throw error;
      window.location.assign(data.url);
      return null;
    },
  });
}

export function useRequestPasswordReset() {
  const { apis } = useAdminApi();
  return useMutation<null, ApiError, { email: string; redirectTo: string }>({
    mutationFn: async (input) => {
      const { error } = await apis.session.requestPasswordReset(getSupabaseClient(), input);
      if (error) throw error;
      return null;
    },
  });
}

export function useVerifyTotp() {
  const { apis } = useAdminApi();
  return useAccessMutation((input: { code: string; factorId?: string }) => apis.session.verifyTotp(getSupabaseClient(), input));
}

export function useSetPassword() {
  const { apis } = useAdminApi();
  return useAccessMutation((password: string) => apis.session.setPassword(getSupabaseClient(), password));
}

/** Novo segundo fator (QR code e chave). Não fica em cache: some ao sair da tela. */
export function useEnrollTotp(enabled: boolean) {
  const { apis, mockKey } = useAdminApi();
  return useQuery<TotpEnrollment, ApiError>({
    queryKey: ["totp-enrollment", mockKey],
    enabled,
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await apis.session.enrollTotp(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/** Sai e limpa tudo o que o painel carregou na memória. */
export function useSignOut() {
  const { apis } = useAdminApi();
  const queryClient = useQueryClient();
  return async () => {
    await apis.session.signOut(getSupabaseClient());
    queryClient.clear();
  };
}
