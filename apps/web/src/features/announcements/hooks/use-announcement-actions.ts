"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AppAnnouncement } from "@guf/core";
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
      if (announcement.ctaPath) router.push(announcement.ctaPath);
    },
    [mark, router],
  );

  return { shown, dismiss, openCta };
}
