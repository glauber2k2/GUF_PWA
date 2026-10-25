"use client";

import { useState } from "react";
import type { StandingsQuery } from "@guf/api";
import { useRivalSearch } from "@/features/competition/api/use-competition";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";

/** Espera a pessoa parar de digitar antes de buscar (uma consulta por pausa, não por tecla). */
const SEARCH_DELAY_MS = 300;

/**
 * Estado da escolha do adversário: texto da busca, página (volta para a 1 quando a busca muda) e o
 * resultado vindo do banco, consultado só com o seletor aberto.
 */
export function useRivalPicker(query: StandingsQuery, isOpen: boolean) {
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);
  const [pageState, setPageState] = useState({ search: debounced, page: 1 });
  const page = pageState.search === debounced ? pageState.page : 1;
  const results = useRivalSearch(query, debounced, page, isOpen);

  return {
    search,
    setSearch,
    /** A busca que já foi para o banco (mostra "Ninguém encontrado para …"). */
    appliedSearch: debounced,
    isTyping: search.trim() !== debounced,
    page,
    goToPage: (next: number) => setPageState({ search: debounced, page: next }),
    clearSearch: () => setSearch(""),
    results,
  };
}
