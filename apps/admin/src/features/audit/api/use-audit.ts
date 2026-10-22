"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { ApiError } from "@guf/api";
import { AUDIT_PAGE_SIZE, type AuditEntry, type AuditFilters } from "@guf/api/admin";
import { useAdminApi } from "@/shared/libs/admin-api";
import { AUDIT_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** Registros da equipe, do mais novo ao mais antigo, em páginas ("Carregar mais"). Só admin. */
export function useAuditLog(filters: Omit<AuditFilters, "beforeId">, enabled = true) {
  const { apis, mockKey } = useAdminApi();
  return useInfiniteQuery<AuditEntry[], ApiError, { pages: AuditEntry[][] }, unknown[], number | undefined>({
    queryKey: [AUDIT_KEY, filters, mockKey],
    enabled,
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apis.team.listAudit(getSupabaseClient(), { ...filters, beforeId: pageParam });
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last) => (last.length < AUDIT_PAGE_SIZE ? undefined : last[last.length - 1]?.id),
  });
}
