"use client";

import { useEffect, useRef } from "react";
import type { AppAnnouncement } from "@guf/core";
import { AnnouncementFullscreen, AnnouncementModalCard, ScreenPortal } from "@/shared/components/ds";

interface BlockingAnnouncementProps {
  announcement: AppAnnouncement;
  onShown: () => void;
  onCta: () => void;
  onDismiss: () => void;
}

/** Tela cheia ou modal por cima do app (z-[70], acima de telas cheias e folhas). Esc = "Agora não". */
export function BlockingAnnouncement({ announcement, onShown, onCta, onDismiss }: BlockingAnnouncementProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onShownRef = useRef(onShown);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onShownRef.current = onShown;
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    onShownRef.current();
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismissRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [announcement.id]);

  const content = {
    tone: announcement.tone,
    title: announcement.title,
    body: announcement.body,
    ctaLabel: announcement.ctaLabel,
    onCta,
    onDismiss,
  };

  return (
    <ScreenPortal>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={announcement.title}
        tabIndex={-1}
        className={
          announcement.format === "fullscreen"
            ? "fixed inset-0 z-[70] animate-guf-fade outline-none"
            : "fixed inset-0 z-[70] grid animate-guf-fade place-items-center bg-scrim p-5 outline-none"
        }
      >
        {announcement.format === "fullscreen" ? (
          <AnnouncementFullscreen {...content} className="mx-auto max-w-[430px] pt-[calc(env(safe-area-inset-top)+3rem)]" />
        ) : (
          <AnnouncementModalCard {...content} className="max-w-[400px] animate-guf-pop-in" />
        )}
      </div>
    </ScreenPortal>
  );
}
