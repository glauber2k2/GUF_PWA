"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { onboardingApi, type ApiError, type OnboardingApi, type TourProgress } from "@guf/api";
import { PROFILE_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockOnboardingApi, seedTourMock } from "@/mocks/onboarding";
import { useAuth } from "@/features/auth";
import { TOUR_VERSION } from "@/features/onboarding/constants/tour-steps";

/** Dados reais por padrão; em DESENVOLVIMENTO com ?estado=, o mock (?estado=tour = conta nova). */
function useOnboardingSource(): { api: OnboardingApi; mock: boolean } {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV === "development") {
    const values = (searchParams.get("estado") ?? "").split(",").map((v) => v.trim().toLowerCase());
    if (values.some(Boolean)) {
      seedTourMock(values.includes("tour"), TOUR_VERSION);
      return { api: mockOnboardingApi, mock: true };
    }
  }
  return { api: onboardingApi, mock: false };
}

function useTourProgressKey() {
  const { user } = useAuth();
  const { mock } = useOnboardingSource();
  return [PROFILE_KEY, "tour", user?.id, mock] as const;
}

/** Versão do tour que a conta já concluiu (vale em todos os aparelhos). */
export function useTourProgress() {
  const { user } = useAuth();
  const { api, mock } = useOnboardingSource();
  return useQuery({
    queryKey: useTourProgressKey(),
    enabled: Boolean(user) || mock,
    // Sem internet não há resposta: o tour só começa sozinho quando a conta confirma que é nova.
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await api.getTourProgress(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Grava a conclusão na conta. A tela muda na hora (otimista); sem internet, o TanStack Query
 * segura a gravação e envia quando a conexão voltar (com o app aberto).
 */
export function useCompleteTour() {
  const queryClient = useQueryClient();
  const { api } = useOnboardingSource();
  const key = useTourProgressKey();
  return useMutation<null, ApiError, number>({
    mutationFn: async (version) => {
      const { error } = await api.completeTour(getSupabaseClient(), { version });
      if (error) throw error;
      return null;
    },
    onMutate: (version) => {
      queryClient.setQueryData<TourProgress>(key, { completedVersion: version });
    },
    retry: 3,
  });
}
