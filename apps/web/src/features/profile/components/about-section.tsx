"use client";

import Link from "next/link";
import { ChevronRight, FileText, Scale, Shield, Sparkles } from "lucide-react";
import { Button, Icon, Logo } from "@/shared/components/ds";
import { LegalDocLink } from "@/features/legal";
import { useSignupDocuments } from "@/features/auth";
import { applyUpdate, usePwaState } from "@/store/global/pwa.store";
import { cn } from "@/shared/helpers/class-names";
import { ProfileSection } from "./profile-ui";

/** Versão do app (package.json do apps/web, injetada no build). */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

const ROW = "flex min-h-[52px] items-center gap-3 rounded-md px-2 text-[15px] font-medium text-fg no-underline hover:bg-surface-3";

/** Documentos legais (central e leitor no app), versão e "Nova versão disponível". */
export function AboutSection() {
  const docs = useSignupDocuments();
  const { waitingWorker } = usePwaState();

  return (
    <ProfileSection id="pf-about" title="Sobre" className="[animation-delay:200ms]">
      <div className="flex flex-col px-2 py-1.5">
        <Link href="/documentos" className={ROW}>
          <Icon icon={Scale} size={18} className="text-fg-secondary" />
          <span className="flex-1">Documentos legais</span>
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </Link>
        <LegalDocLink docType="terms" url={docs.data?.terms.url} className={cn(ROW, "border-t border-border font-normal")}>
          <Icon icon={FileText} size={18} className="text-fg-secondary" />
          <span className="flex-1">Termos de Uso</span>
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </LegalDocLink>
        <LegalDocLink docType="privacy" url={docs.data?.privacy.url} className={cn(ROW, "border-t border-border font-normal")}>
          <Icon icon={Shield} size={18} className="text-fg-secondary" />
          <span className="flex-1">Política de Privacidade</span>
          <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
        </LegalDocLink>
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
