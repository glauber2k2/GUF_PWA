"use client";

import { ChevronRight, CircleHelp, Sparkles } from "lucide-react";
import { Button, Icon, Logo } from "@/shared/components/ds";
import { useTour } from "@/features/onboarding";
import { applyUpdate, usePwaState } from "@/store/global/pwa.store";
import { cn } from "@/shared/helpers/class-names";
import { ProfileSection } from "./profile-ui";

/** Versão do app (package.json do apps/web, injetada no build). */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

const ROW = "flex min-h-[52px] items-center gap-3 rounded-md px-2 text-[15px] font-medium text-fg no-underline hover:bg-surface-3";

/** Tutorial, versão e "Nova versão disponível" (os documentos legais ficam em Configurações › Documentos). */
export function AboutSection() {
  const { waitingWorker } = usePwaState();
  const tour = useTour();

  return (
    <ProfileSection id="pf-about" title="Sobre" className="[animation-delay:200ms]">
      <div className="flex flex-col px-2 py-1.5">
        <button type="button" onClick={tour.start} className={cn(ROW, "w-full cursor-pointer bg-transparent text-left")}>
          <Icon icon={CircleHelp} size={18} className="text-fg-secondary" />
          <span className="flex-1">Ver tutorial novamente</span>
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </button>
        <div className="flex min-h-14 items-center gap-3 border-t border-border p-2">
          <Logo size="sm" />
          <span className="flex-1 text-sm text-fg-secondary tabular-nums">Versão {APP_VERSION}</span>
        </div>
        {waitingWorker && (
          <div className="mt-0.5 mb-1.5 flex items-center gap-2.5 rounded-md bg-banner-info py-2.5 pr-2.5 pl-3">
            <Icon icon={Sparkles} size={18} className="text-info" />
            <span className="flex-1 text-sm leading-5">Nova versão disponível</span>
            <Button variant="secondary" onClick={applyUpdate}>
              Atualizar
            </Button>
          </div>
        )}
      </div>
    </ProfileSection>
  );
}
