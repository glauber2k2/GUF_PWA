"use client";

import { useEffect } from "react";
import { AnnouncementBannerCard } from "@/shared/components/ds";
import { useAnnouncementQueue } from "@/features/announcements/api/use-announcements";
import { useAnnouncementActions } from "@/features/announcements/hooks/use-announcement-actions";

/** Faixa de comunicado no topo da Início (composta na rota, pelo `topSlot` da HomeScreen). */
export function HomeAnnouncementBanner() {
  const banner = useAnnouncementQueue()?.banner ?? null;
  const { shown, dismiss, openCta } = useAnnouncementActions();

  useEffect(() => {
    if (banner) shown(banner);
  }, [banner, shown]);

  if (!banner) return null;
  return (
    <AnnouncementBannerCard
      tone={banner.tone}
      title={banner.title}
      body={banner.body}
      ctaLabel={banner.ctaLabel}
      onCta={() => openCta(banner)}
      onDismiss={() => dismiss(banner)}
      className="animate-guf-rise-fast"
    />
  );
}
