"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/** Volta para a tela anterior; aberto direto pelo link (sem histórico), vai para `fallback`. */
export function useGoBack(fallback = "/historico") {
  const router = useRouter();
  return useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.replace(fallback);
  }, [router, fallback]);
}
