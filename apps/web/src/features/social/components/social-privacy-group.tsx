"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, ChevronRight, UsersRound } from "lucide-react";
import { Button, ConfirmDialog, Icon, Skeleton } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useCanUseSocial, useMySocial, useRevokeSharingConsent } from "@/features/social/api/use-social";
import { SocialPrivacySettings } from "@/features/social/components/social-privacy-settings";

/**
 * Configurações › Privacidade: perfil privado, histórico oculto, pessoas bloqueadas e revogar o
 * compartilhamento (remove os seguidores e fecha o perfil; confirmação com botões de mesmo peso).
 */
export function SocialPrivacyGroup() {
  const social = useMySocial();
  const canUse = useCanUseSocial();
  const revoke = useRevokeSharingConsent();
  const { showToast } = useAppShell();
  const [confirm, setConfirm] = useState(false);

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
      {social.data.hasConsent && (
        <div className="flex flex-col gap-2 border-t border-border py-3">
          <div className="flex items-center gap-3.5">
            <span className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
              <Icon icon={UsersRound} size={18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <strong className="text-[15px] leading-5">Compartilhamento de treinos</strong>
              <span className="text-[13px] leading-[18px] text-fg-secondary">Autorizado · seguidores aprovados veem seus treinos</span>
            </span>
          </div>
          <Button variant="outline" disabled={!canUse} loading={revoke.isPending} onClick={() => setConfirm(true)} className="self-start text-sm">
            Revogar compartilhamento
          </Button>
        </div>
      )}
      <ConfirmDialog
        placement="screen"
        balanced
        open={confirm}
        title="Revogar o compartilhamento?"
        message="Seus seguidores serão removidos e o perfil volta a ser privado. Quem você segue continua igual."
        cancelLabel="Cancelar"
        confirmLabel="Revogar"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          revoke.mutate(undefined, {
            onSuccess: () => showToast("Compartilhamento revogado", { tone: "success", message: "Seus seguidores foram removidos e o perfil está privado." }),
            onError: (error) => showToast(error.message, { tone: "error" }),
          });
        }}
      />
    </div>
  );
}
