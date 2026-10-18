"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { profileApi, type ApiError, type Profile, type ProfileApi, type ProfileUpdate } from "@guf/api";
import { invalidateProfileData, PROFILE_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockProfileApi, setProfileMockScenario } from "@/mocks/profile";
import { useAuth } from "@/features/auth";
import { useDevProfileState, type DevProfileState } from "@/features/profile/hooks/use-dev-profile-state";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (mesmo contrato). */
export function useProfileSource(): { api: ProfileApi; dev: DevProfileState; mock: boolean } {
  const dev = useDevProfileState();
  if (process.env.NODE_ENV === "development" && dev.scenario) {
    setProfileMockScenario(dev.scenario, dev.withPhoto);
    return { api: mockProfileApi, dev, mock: true };
  }
  return { api: profileApi, dev, mock: false };
}

export function useProfile() {
  const { user } = useAuth();
  const { api, dev } = useProfileSource();
  return useQuery({
    queryKey: [PROFILE_KEY, "profile", user?.id, dev.scenario, dev.withPhoto],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await api.getProfile(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

export function useConsents() {
  const { user } = useAuth();
  const { api, dev } = useProfileSource();
  return useQuery({
    queryKey: [PROFILE_KEY, "consents", user?.id, dev.scenario],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await api.getConsents(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/** Alterar o perfil exige internet (mesma regra de Projetos/Rotinas). */
export function useCanEditProfile(): boolean {
  const online = useOnlineStatus();
  const { dev } = useProfileSource();
  return online && !dev.forceOffline;
}

/**
 * Altera nome, unidade ou meta. A tela muda na hora (otimista) e volta ao valor anterior se falhar;
 * no fim, Perfil, Início e Histórico recarregam (unidade e meta aparecem lá).
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { api, dev } = useProfileSource();
  const key = [PROFILE_KEY, "profile", user?.id, dev.scenario, dev.withPhoto];
  return useMutation<null, ApiError, ProfileUpdate, { previous: Profile | undefined }>({
    mutationFn: async (input) => {
      const { error } = await api.updateProfile(getSupabaseClient(), input);
      if (error) throw error;
      return null;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Profile>(key);
      if (previous) queryClient.setQueryData<Profile>(key, { ...previous, ...input, ...(input.name !== undefined && { name: input.name.trim() }) });
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => invalidateProfileData(queryClient),
  });
}

/** Revoga o consentimento de saúde (o banco apaga todas as medidas). */
export function useRevokeHealthConsent() {
  const queryClient = useQueryClient();
  const { api } = useProfileSource();
  return useMutation<null, ApiError>({
    mutationFn: async () => {
      const { error } = await api.revokeHealthConsent(getSupabaseClient());
      if (error) throw error;
      return null;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [PROFILE_KEY] }),
  });
}
