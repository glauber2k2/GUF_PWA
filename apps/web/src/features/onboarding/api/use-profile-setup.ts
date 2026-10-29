"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError, ProfileSetupStatus } from "@guf/api";
import { PROFILE_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { useAuth } from "@/features/auth";
import { useOnboardingSource } from "@/features/onboarding/api/use-tour-progress";

function useProfileSetupKey() {
  const { user } = useAuth();
  const { mock } = useOnboardingSource();
  return [PROFILE_KEY, "profile-setup", user?.id, mock] as const;
}

/** Se a conta já passou pelo cadastro em passos (vale em todos os aparelhos). */
export function useProfileSetupStatus() {
  const { user } = useAuth();
  const { api, mock } = useOnboardingSource();
  return useQuery({
    queryKey: useProfileSetupKey(),
    enabled: Boolean(user) || mock,
    staleTime: Infinity,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await api.getProfileSetupStatus(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/** Conclui (ou pula) o cadastro em passos. Otimista: a tela segue na hora. */
export function useCompleteProfileSetup() {
  const queryClient = useQueryClient();
  const { api } = useOnboardingSource();
  const key = useProfileSetupKey();
  return useMutation<null, ApiError, void>({
    mutationFn: async () => {
      const { error } = await api.completeProfileSetup(getSupabaseClient());
      if (error) throw error;
      return null;
    },
    onMutate: () => {
      queryClient.setQueryData<ProfileSetupStatus>(key, { isCompleted: true });
    },
    retry: 3,
  });
}
