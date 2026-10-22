"use client";

import { useEffect } from "react";
import { Crown, X } from "lucide-react";
import { planUpsellCopy, type Entitlements, type PlanFeature } from "@guf/core";
import { Button, Icon, IconButton, ScreenPortal } from "@/shared/components/ds";

export interface ProUpsellScreenProps {
  /** Funcionalidade que a pessoa tentou usar; null = fechada. */
  feature: PlanFeature | null;
  entitlements: Entitlements | null;
  onSeePlans: () => void;
  onClose: () => void;
}

/**
 * "Isso faz parte do Pro": aparece na hora de USAR algo além do plano (a pessoa preencheu tudo e
 * tocou em salvar, abriu um período ou mandou a pergunta). Fica por cima de folhas e telas cheias
 * (z-[70], como os diálogos); o que estava na tela continua lá ao fechar.
 */
export function ProUpsellScreen({ feature, entitlements, onSeePlans, onClose }: ProUpsellScreenProps) {
  useEffect(() => {
    if (!feature) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feature, onClose]);

  if (!feature) return null;
  const copy = planUpsellCopy(feature, entitlements);

  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-guf-rise-fast" role="dialog" aria-modal="true" aria-labelledby="pro-upsell-title">
        <div className="flex justify-end px-2 pt-[calc(8px+env(safe-area-inset-top))]">
          <IconButton icon={X} label="Fechar" variant="ghost" onClick={onClose} />
        </div>
        <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-accent/16 text-accent-text">
            <Icon icon={Crown} size={32} />
          </span>
          <p className="m-0 text-[13px] leading-[18px] font-semibold tracking-[0.08em] text-accent-text uppercase">Isso faz parte do Pro</p>
          <h1 id="pro-upsell-title" className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-balance">
            {copy.title}
          </h1>
          <p className="m-0 max-w-[340px] text-base leading-6 text-pretty text-fg-secondary">{copy.message}</p>
        </div>
        <div className="mx-auto flex w-full max-w-[430px] flex-col gap-2 px-6 pb-[calc(24px+env(safe-area-inset-bottom))]">
          <Button autoFocus size="lg" fullWidth sheen icon={Crown} onClick={onSeePlans}>
            Conhecer o Pro
          </Button>
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>
            Agora não
          </Button>
        </div>
      </div>
    </ScreenPortal>
  );
}
