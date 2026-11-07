"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toInternalPath, type AppAnnouncement } from "@guf/core";
import { useMarkAnnouncement } from "@/features/announcements/api/use-announcements";

/** Ações de um comunicado: visto, "Agora não" e botão (marca e abre a tela de destino). */
export function useAnnouncementActions() {
  const router = useRouter();
  const mark = useMarkAnnouncement();

  const shown = useCallback((announcement: AppAnnouncement) => mark(announcement.id, "seen"), [mark]);
  const dismiss = useCallback((announcement: AppAnnouncement) => mark(announcement.id, "dismissed"), [mark]);
  const openCta = useCallback(
    (announcement: AppAnnouncement) => {
      mark(announcement.id, "cta");
      // O destino vem do banco: só caminho interno (nunca outro site).
      const target = toInternalPath(announcement.ctaPath);
      if (target) router.push(target);
    },
    [mark, router],
  );

  return { shown, dismiss, openCta };
}
