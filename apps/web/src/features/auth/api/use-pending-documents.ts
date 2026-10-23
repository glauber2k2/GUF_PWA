"use client";

import { useQuery } from "@tanstack/react-query";
import { getPendingDocuments, getSignupDocuments, type AuthError, type LegalDocument } from "@guf/api";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { useAuth } from "@/features/auth/providers/auth-provider";

/**
 * Documentos obrigatórios ainda não aceitos pelo usuário logado (portão /aceite). Sem internet não
 * insiste: o portão deixa o app abrir e a consulta roda de novo ao reconectar (padrão do TanStack).
 */
export function usePendingDocuments() {
  const { user } = useAuth();
  return useQuery<LegalDocument[], AuthError>({
    queryKey: ["pending-documents", user?.id],
    enabled: Boolean(user),
    retry: (failures, error) => error.code !== "network_error" && failures < 1,
    queryFn: async () => {
      const { data, error } = await getPendingDocuments(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}

/** Versões vigentes de termos, privacidade e idade exibidas no cadastro (público). */
export function useSignupDocuments() {
  return useQuery({
    queryKey: ["signup-documents"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await getSignupDocuments(getSupabaseClient());
      if (error) throw error;
      return data;
    },
  });
}
