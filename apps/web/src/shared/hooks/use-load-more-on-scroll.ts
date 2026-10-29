"use client";

import { useEffect, useRef } from "react";

/** Começa a buscar a próxima página quando o fim da lista está a esta distância da tela. */
const PREFETCH_MARGIN_PX = 600;

/**
 * Lista infinita: devolve o ref de um marcador no fim da lista; quando ele chega perto da tela,
 * chama `onLoadMore` (uma página por vez: nada enquanto `isLoading` ou sem `hasMore`).
 * @param hasMore ainda há página para buscar
 * @param isLoading uma página está chegando
 * @param onLoadMore busca a próxima página
 */
export function useLoadMoreOnScroll({ hasMore, isLoading, onLoadMore }: { hasMore: boolean; isLoading: boolean; onLoadMore: () => void }) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: `0px 0px ${PREFETCH_MARGIN_PX}px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return sentinelRef;
}
