"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleDashed, ShieldCheck } from "lucide-react";
import {
  formatDayMonthYear,
  LEGAL_DOCUMENTS,
  LEGAL_DPO_EMAIL,
  LEGAL_READER_ORDER,
  legalAcceptance,
  type LegalAcceptance,
  type LegalReaderDocType,
} from "@guf/core";
import { Banner, Icon, IconButton } from "@/shared/components/ds";
import { useLegalOverview } from "@/features/legal/api/use-legal";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { cn } from "@/shared/helpers/class-names";
import { useAuth } from "@/features/auth";
import { useLegalBack } from "./legal-document-page";
import { PRIVACY_SETTINGS_PATH, useLegalReader } from "@/features/legal/providers/legal-reader-provider";
import { LegalHashCheck } from "@/features/legal/components/legal-hash-check";
import { LEGAL_ICONS, LegalText } from "@/features/legal/components/legal-ui";

const FEMININE: Partial<Record<LegalReaderDocType, true>> = { privacy: true };

function statusOf(docType: LegalReaderDocType, acceptance: LegalAcceptance, acceptedAt: string | null) {
  if (acceptance === "accepted" && acceptedAt) {
    const verb = docType === "health_consent" ? "Autorizado" : FEMININE[docType] ? "Aceita" : "Aceito";
    return { icon: CircleCheck, className: "text-success", text: `${verb} em ${formatDayMonthYear(new Date(acceptedAt))}` };
  }
  if (acceptance === "outdated") return { icon: CircleAlert, className: "text-warning", text: "Nova versão para aceitar" };
  return docType === "health_consent"
    ? { icon: CircleDashed, className: "text-fg-muted", text: "Não autorizado · só é pedido ao ativar as medidas corporais" }
    : { icon: CircleDashed, className: "text-fg-muted", text: FEMININE[docType] ? "Não aceita" : "Não aceito" };
}

/** Perfil › Sobre › Documentos legais (/documentos): os documentos, versão vigente e aceite. */
export function LegalCentral() {
  const { user } = useAuth();
  const online = useOnlineStatus();
  const overview = useLegalOverview();
  const { openLegal } = useLegalReader();
  const { back, backLabel } = useLegalBack();
  const accepted = overview.data?.accepted ?? null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col text-fg">
      <header className="sticky top-0 z-[5] flex h-[calc(52px+env(safe-area-inset-top))] items-center bg-background px-1 pt-[env(safe-area-inset-top)]">
        <IconButton icon={ChevronLeft} label={backLabel} variant="ghost" onClick={back} />
      </header>
      <div className="flex flex-col gap-5 px-4 pt-2 pb-[calc(40px+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2 px-1">
          <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.02em]">Documentos legais</h1>
          <p className="m-0 text-[15px] leading-[22px] text-pretty text-fg-secondary">
            As regras de uso do guf e de como seus dados são tratados. Toque para ler a versão em vigor.
          </p>
        </div>

        {process.env.NODE_ENV === "development" && <LegalHashCheck />}

        {!online && (
          <Banner tone="warning" title="Sem conexão">
            os documentos continuam disponíveis no aparelho; a versão e o seu aceite aparecem quando a internet voltar.
          </Banner>
        )}

        <div className="flex flex-col gap-2.5">
          {LEGAL_READER_ORDER.map((doc) => {
            const content = LEGAL_DOCUMENTS[doc];
            const current = overview.data?.current[content.docType] ?? null;
            const acc = accepted?.[content.docType] ?? null;
            const status = accepted ? statusOf(content.docType, legalAcceptance(current?.version ?? null, acc?.version ?? null), acc?.acceptedAt ?? null) : null;
            return (
              <a
                key={doc}
                href={content.route}
                onClick={(e) => {
                  e.preventDefault();
                  openLegal(doc);
                }}
                className="flex min-h-[88px] items-center gap-3.5 rounded-lg border border-border bg-surface py-3.5 pr-3 pl-4 text-fg no-underline shadow-e1"
              >
                <span className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
                  <Icon icon={LEGAL_ICONS[content.icon]} size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                  <span className="text-base leading-[22px] font-semibold">{content.title}</span>
                  {current && (
                    <span className="text-[13px] leading-[18px] text-fg-secondary">
                      Versão {current.version} · em vigor desde {formatDayMonthYear(new Date(current.publishedAt))}
                    </span>
                  )}
                  {status && (
                    <span className={cn("flex items-start gap-1.5 text-[13px] leading-[18px] font-medium", status.className)}>
                      <Icon icon={status.icon} size={14} className="mt-0.5" />
                      <span className="text-pretty">{status.text}</span>
                    </span>
                  )}
                </span>
                <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
              </a>
            );
          })}
        </div>

        {user && (
          <Link
            href={PRIVACY_SETTINGS_PATH}
            className="flex min-h-16 items-center gap-3.5 rounded-lg border border-border-strong py-3 pr-3 pl-4 text-fg no-underline"
          >
            <span className="grid size-10 flex-none place-items-center rounded-md bg-accent-tile text-accent-text">
              <Icon icon={ShieldCheck} size={20} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-[15px] leading-[22px] font-semibold">Meus direitos e dados</span>
              <span className="text-[13px] leading-[18px] text-fg-secondary">Exportar, corrigir ou apagar · Perfil › Privacidade</span>
            </span>
            <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
          </Link>
        )}

        <p className="m-0 px-1 text-[13px] leading-[18px] text-pretty text-fg-muted">
          Dúvidas sobre seus dados: <LegalText text={LEGAL_DPO_EMAIL} small />
        </p>
      </div>
    </main>
  );
}
