"use client";

import { FileText } from "lucide-react";
import { acceptedLabel, LEGAL_DOC_TITLES, legalReaderTarget } from "@guf/core";
import type { Consents } from "@guf/api";
import { Icon } from "@/shared/components/ds";
import { useLegalReader } from "@/features/legal";
import { ProfileSection } from "./profile-ui";

/** O que você aceitou (documento, versão e data), com "Ler" no leitor do app. */
export function AcceptedDocumentsSection({ consents }: { consents: Consents | undefined }) {
  const documents = consents?.documents ?? [];
  const { openLegal } = useLegalReader();
  return (
    <ProfileSection id="pf-accepted" title="Documentos aceitos" className="[animation-delay:60ms]">
      <div className="flex flex-col px-2 py-1.5">
        {documents.length === 0 && <p className="m-0 p-2 text-sm text-fg-secondary">Nenhum documento aceito encontrado.</p>}
        {documents.map((doc, index) => {
          const title = LEGAL_DOC_TITLES[doc.docType];
          return (
            <div key={doc.docType} className={index > 0 ? "flex min-h-16 items-center gap-3 border-t border-border p-2" : "flex min-h-16 items-center gap-3 p-2"}>
              <Icon icon={FileText} size={20} className="text-fg-secondary" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] leading-5 font-semibold">{title}</span>
                <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">{acceptedLabel(doc.docType, doc.acceptedAt, doc.version)}</span>
              </span>
              <a
                href={doc.url}
                onClick={(e) => {
                  e.preventDefault();
                  const target = legalReaderTarget(doc.docType);
                  if (target) openLegal(target.doc, target.anchor);
                }}
                aria-label={`Ler ${title}`}
                className="flex h-11 min-w-11 items-center justify-center rounded-md px-2.5 text-sm font-semibold text-accent-text hover:bg-surface-3"
              >
                Ler
              </a>
            </div>
          );
        })}
      </div>
    </ProfileSection>
  );
}
