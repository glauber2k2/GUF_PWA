"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ApiError } from "@guf/api";
import type { AdminUserSummary } from "@guf/api/admin";
import { unwrap } from "@/shared/helpers/unwrap";
import { useAdminApi } from "@/shared/libs/admin-api";
import { PEOPLE_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

export const MIN_PEOPLE_QUERY_LENGTH = 2;

/** Busca por @, nome, e-mail exato ou id (a partir de 2 caracteres). Pessoas e comunicados usam. */
export function useSearchPeople(query: string) {
  const { apis, mockKey } = useAdminApi();
  const q = query.trim();
  return useQuery<AdminUserSummary[], ApiError>({
    queryKey: [PEOPLE_KEY, "search", q, mockKey],
    enabled: q.length >= MIN_PEOPLE_QUERY_LENGTH,
    placeholderData: keepPreviousData,
    queryFn: () => unwrap(apis.users.searchUsers(getSupabaseClient(), q)),
  });
}
