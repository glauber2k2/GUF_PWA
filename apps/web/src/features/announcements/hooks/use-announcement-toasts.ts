"use client";

import { useEffect, useRef } from "react";
import { ANNOUNCEMENT_TONES, type AppAnnouncement } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { useAnnouncementActions } from "@/features/announcements/hooks/use-announcement-actions";

/**
 * Comunicados em toast entram na pilha do AppShell (mesmo componente dos outros avisos), uma vez
 * por abertura. Sumiu sem tocar no botão = fechado.
 */
export function useAnnouncementToasts(toasts: AppAnnouncement[], enabled: boolean) {
  const { showToast } = useAppShell();
  const { shown, dismiss, openCta } = useAnnouncementActions();
  const shownIds = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;
    for (const announcement of toasts) {
      if (shownIds.current.has(announcement.id)) continue;
      shownIds.current.add(announcement.id);
      shown(announcement);
      showToast(announcement.title, {
        tone: announcement.tone === "success" || announcement.tone === "warning" ? announcement.tone : "info",
        message: announcement.body || ANNOUNCEMENT_TONES[announcement.tone].label,
        actionLabel: announcement.ctaLabel ?? undefined,
        onAction: announcement.ctaLabel ? () => openCta(announcement) : undefined,
        onClose: () => dismiss(announcement),
        haptic: false,
      });
    }
  }, [toasts, enabled, showToast, shown, dismiss, openCta]);
}
