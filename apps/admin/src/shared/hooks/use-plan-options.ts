"use client";

import { useQuery } from "@tanstack/react-query";
import type { ApiError } from "@guf/api";
import type { AdminPlanOption } from "@guf/api/admin";
import { useAdminApi } from "@/shared/libs/admin-api";
import { PLANS_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** Catálogo de planos (leitura pública): opções do "Mudar plano" e nomes no público dos comunicados. */
export function usePlanOptions() {
  const { apis, mockKey } = useAdminApi();
  return useQuery<AdminPlanOption[], ApiError>({
    queryKey: [PLANS_KEY, mockKey],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await apis.users.listPlans(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/** { free: "Free", pro: "Pro" } para os textos do público. */
export function usePlanNames(): Record<string, string> {
  const plans = usePlanOptions();
  return Object.fromEntries((plans.data ?? []).map((p) => [p.code, p.name]));
}
