"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError, ApiResult } from "@guf/api";
import {
  CATALOG_PAGE_SIZE,
  type CatalogCreateResult,
  type CatalogDeleteResult,
  type CatalogExerciseFilters,
  type CatalogExercisePage,
  type CatalogExerciseSource,
  type CatalogExerciseUsage,
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

/** Gravação no catálogo: ao dar certo, a lista e a auditoria recarregam. */
function useCatalogMutation<TInput, TResult>(run: (input: TInput) => Promise<ApiResult<TResult>>) {
  const queryClient = useQueryClient();
  return useMutation<TResult, ApiError, TInput>({
    mutationFn: async (input) => {
      const { data, error } = await run(input);
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

export function useCreateCatalogExercises() {
  const { apis } = useAdminApi();
  return useCatalogMutation((input: { exercises: CatalogExerciseInput[]; source: CatalogExerciseSource }): Promise<ApiResult<CatalogCreateResult>> =>
    apis.exercises.createCatalogExercises(getSupabaseClient(), input),
  );
}

export function useUpdateCatalogExercise() {
  const { apis } = useAdminApi();
  return useCatalogMutation((input: { id: string; exercise: CatalogExerciseInput }) => apis.exercises.updateCatalogExercise(getSupabaseClient(), input));
}

export function useDeleteCatalogExercise() {
  const { apis } = useAdminApi();
  return useCatalogMutation((id: string): Promise<ApiResult<CatalogDeleteResult>> => apis.exercises.deleteCatalogExercise(getSupabaseClient(), { id }));
}

/** Em quantas rotinas e treinos o exercício aparece (decide se excluir apaga ou arquiva). */
export function useCatalogExerciseUsage(id: string) {
  const { apis, mockKey } = useAdminApi();
  return useQuery<CatalogExerciseUsage, ApiError>({
    queryKey: [EXERCISE_CATALOG_KEY, "usage", id, mockKey],
    queryFn: async () => {
      const { data, error } = await apis.exercises.getCatalogExerciseUsage(getSupabaseClient(), { id });
      if (error) throw error;
      return data;
    },
  });
}
