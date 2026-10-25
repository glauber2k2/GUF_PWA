"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApiError } from "@guf/api";
import {
  CATALOG_PAGE_SIZE,
  type CatalogCreateResult,
  type CatalogExerciseFilters,
  type CatalogExercisePage,
  type CatalogExerciseSource,
} from "@guf/api/admin";
import type { CatalogExerciseInput } from "@guf/schemas";
import { useAdminApi } from "@/shared/libs/admin-api";
import { AUDIT_KEY, EXERCISE_CATALOG_KEY } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** Catálogo do guf com busca e grupos musculares, em páginas ("Carregar mais"). */
export function useCatalogExercises(filters: Omit<CatalogExerciseFilters, "offset">) {
  const { apis, mockKey } = useAdminApi();
  return useInfiniteQuery<CatalogExercisePage, ApiError, { pages: CatalogExercisePage[] }, unknown[], number>({
    queryKey: [EXERCISE_CATALOG_KEY, filters, mockKey],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await apis.exercises.listCatalogExercises(getSupabaseClient(), { ...filters, offset: pageParam });
      if (error) throw error;
      return data;
    },
    getNextPageParam: (last, pages) => {
      const loaded = pages.length * CATALOG_PAGE_SIZE;
      return last.items.length < CATALOG_PAGE_SIZE || loaded >= last.total ? undefined : loaded;
    },
  });
}

/** Chaves dos nomes que já estão no catálogo (revisão do arquivo). */
export function useFindExistingCatalogNames() {
  const { apis } = useAdminApi();
  return useMutation<string[], ApiError, string[]>({
    mutationFn: async (names) => {
      const { data, error } = await apis.exercises.findExistingCatalogNames(getSupabaseClient(), { names });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCatalogExercises() {
  const { apis } = useAdminApi();
  const queryClient = useQueryClient();
  return useMutation<CatalogCreateResult, ApiError, { exercises: CatalogExerciseInput[]; source: CatalogExerciseSource }>({
    mutationFn: async (input) => {
      const { data, error } = await apis.exercises.createCatalogExercises(getSupabaseClient(), input);
      if (error) throw error;
      return data;
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [EXERCISE_CATALOG_KEY] }),
        queryClient.invalidateQueries({ queryKey: [AUDIT_KEY] }),
      ]),
  });
}
