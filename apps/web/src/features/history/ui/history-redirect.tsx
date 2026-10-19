"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { historyAnchorPath } from "@/features/history/helpers/paths";

/** /historico virou seção da Início: links salvos e o app instalado antigo caem no lugar certo. */
export function HistoryRedirect() {
  const router = useRouter();
  const search = useSearchParams().toString();
  useEffect(() => router.replace(historyAnchorPath(search)), [router, search]);
  return null;
}
