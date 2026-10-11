"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import { Button, Icon, Logo } from "@/components/ds";
import { useSignupDocuments } from "@/hooks/use-pending-documents";
import { applyUpdate, usePwaState } from "@/lib/pwa/pwa-store";
import { cn } from "@/lib/utils";
import { ProfileSection } from "./profile-ui";

/** Versão do app (package.json do apps/web, injetada no build). */
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** Termos e Política vigentes (URL publicada em legal_documents), versão e "Nova versão disponível". */
export function AboutSection() {
  const docs = useSignupDocuments();
  const { waitingWorker } = usePwaState();
  const links = [
    { label: "Termos de Uso", href: docs.data?.terms.url },
    { label: "Política de Privacidade", href: docs.data?.privacy.url },
  ];

  return (
    <ProfileSection id="pf-about" title="Sobre" className="[animation-delay:200ms]">
      <div className="flex flex-col px-2 py-1.5">
        {links.map((link, i) =>
          link.href ? (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("flex min-h-12 items-center gap-3 rounded-md px-2 text-[15px] font-medium text-fg hover:bg-surface-3", i > 0 && "border-t border-border")}
            >
              <span className="flex-1">{link.label}</span>
              <span className="sr-only">(abre em nova aba)</span>
              <Icon icon={ExternalLink} size={16} className="text-fg-muted" />
            </a>
          ) : (
            <span key={link.label} className={cn("flex min-h-12 items-center px-2 text-[15px] font-medium text-fg-muted", i > 0 && "border-t border-border")}>
              {link.label}
            </span>
          ),
        )}
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
