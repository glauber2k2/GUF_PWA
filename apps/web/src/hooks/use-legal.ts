"use client";

import { useQuery } from "@tanstack/react-query";
import { getLegalOverview } from "@guf/api";
import { LEGAL_OVERVIEW_KEY } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { useAuth } from "@/providers/auth-provider";

/**
 * Versões vigentes dos documentos (público) e, para quem está logado, o último aceite de cada um.
 * Sem internet: o leitor continua com o texto (que é do app) e só esconde versão e aceite.
 */
export function useLegalOverview() {
  const { user, isLoading } = useAuth();
  return useQuery({
    queryKey: [LEGAL_OVERVIEW_KEY, user?.id ?? null],
    enabled: !isLoading,
    staleTime: 5 * 60_000,
    retry: 1,
    queryFn: async () => {
      const { data, error } = await getLegalOverview(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}
