"use client";

import Link from "next/link";
import { Ban, ChevronRight } from "lucide-react";
import { Icon, Skeleton } from "@/shared/components/ds";
import { useCanUseSocial, useMySocial } from "@/features/social/api/use-social";
import { SocialPrivacySettings } from "@/features/social/components/social-privacy-settings";

/** Configurações › Privacidade: perfil privado, histórico oculto e pessoas bloqueadas. */
export function SocialPrivacyGroup() {
  const social = useMySocial();
  const canUse = useCanUseSocial();

  if (!social.data) return <Skeleton className="h-48 w-full rounded-lg" />;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-2">
      <SocialPrivacySettings social={social.data} disabled={!canUse} />
      <Link href="/seguidores?aba=bloqueados" className="flex min-h-14 items-center gap-3.5 border-t border-border py-2 text-fg no-underline">
        <span className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
          <Icon icon={Ban} size={18} />
        </span>
        <strong className="flex-1 text-[15px] leading-5">Pessoas bloqueadas</strong>
        <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
      </Link>
    </div>
  );
}
