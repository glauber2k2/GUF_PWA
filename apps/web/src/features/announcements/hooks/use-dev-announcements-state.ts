"use client";

import { useSearchParams } from "next/navigation";
import type { AnnouncementsMockScenario } from "@/mocks/announcements";

const SCENARIOS: AnnouncementsMockScenario[] = ["aviso-tela-cheia", "aviso-modal", "aviso-toast", "aviso-faixa", "aviso-todos"];

/**
 * ?estado= dos comunicados — SÓ EM DESENVOLVIMENTO (eliminado do build de produção).
 * Ex.: /?estado=padrao,aviso-modal · aviso-tela-cheia · aviso-toast · aviso-faixa · aviso-todos.
 * Sem um desses valores, os comunicados vêm do banco.
 */
export function useDevAnnouncementsScenario(): AnnouncementsMockScenario | null {
  const searchParams = useSearchParams();
  if (process.env.NODE_ENV !== "development") return null;
  const values = (searchParams.get("estado") ?? "").split(",").map((v) => v.trim().toLowerCase());
  return SCENARIOS.find((v) => values.includes(v)) ?? null;
}
