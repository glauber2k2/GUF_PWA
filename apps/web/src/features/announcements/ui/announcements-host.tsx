"use client";

import { useAppShell } from "@/features/app-shell";
import { useAnnouncementQueue } from "@/features/announcements/api/use-announcements";
import { useAnnouncementActions } from "@/features/announcements/hooks/use-announcement-actions";
import { useAnnouncementToasts } from "@/features/announcements/hooks/use-announcement-toasts";
import { BlockingAnnouncement } from "@/features/announcements/components/blocking-announcement";

/**
 * Comunicados do painel ao abrir o app: tela cheia ou modal (um por abertura) e toasts. Nunca durante
 * o treino, nas telas imersivas ou antes de a abertura terminar (`isBusy`). A faixa fica na Início.
 */
export function AnnouncementsHost() {
  const { isBusy } = useAppShell();
  const queue = useAnnouncementQueue();
  const { shown, dismiss, openCta } = useAnnouncementActions();
  useAnnouncementToasts(queue?.toasts ?? [], !isBusy);

  const blocking = isBusy ? null : (queue?.blocking ?? null);
  if (!blocking) return null;
  return (
    <BlockingAnnouncement
      announcement={blocking}
      onShown={() => shown(blocking)}
      onCta={() => openCta(blocking)}
      onDismiss={() => dismiss(blocking)}
    />
  );
}
