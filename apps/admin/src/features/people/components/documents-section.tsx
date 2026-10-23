"use client";

import { FileText } from "lucide-react";
import type { AdminUserDocument } from "@guf/api/admin";
import { DOCUMENT_ACCEPTANCE_LABELS, type DocumentAcceptance } from "@guf/core";
import { cn, Icon } from "@guf/ui";
import { DOCUMENT_LABELS, formatDate } from "@/features/people/helpers/people";
import { Panel, PanelSection } from "@/shared/components/panel";

const STATUS_TONE: Record<DocumentAcceptance, string> = {
  accepted: "bg-success/14 text-success",
  outdated: "bg-warning/14 text-warning",
  not_accepted: "bg-surface-3 text-fg-secondary",
};

function documentDetail(doc: AdminUserDocument): string {
  if (doc.status === "not_accepted") {
    return doc.docType === "subscription_terms" ? `Versão vigente ${doc.currentVersion} · pedido só ao assinar` : `Versão vigente ${doc.currentVersion} · nunca aceito`;
  }
  const accepted = `Versão ${doc.acceptedVersion} aceita em ${formatDate(doc.acceptedAt as string)}`;
  return doc.status === "outdated" ? `${accepted} · vigente ${doc.currentVersion}` : accepted;
}

/** Documentos vigentes do cadastro e da assinatura: aceitos, com versão nova pendente ou não aceitos. */
export function DocumentsSection({ documents }: { documents: AdminUserDocument[] }) {
  return (
    <PanelSection id="sec-docs" title="Documentos">
      <Panel as="ul">
        {documents.length === 0 && <li className="px-4 py-3 text-[13px] text-fg-secondary">Nenhum documento publicado.</li>}
        {documents.map((doc) => (
          <li key={doc.docType} className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2">
            <Icon icon={FileText} size={17} className="text-fg-secondary" />
            <span className="flex min-w-0 flex-[1_1_12rem] flex-col">
              <strong className="text-sm">{DOCUMENT_LABELS[doc.docType] ?? doc.docType}</strong>
              <span className="text-[13px] text-fg-secondary">{documentDetail(doc)}</span>
            </span>
            <span className={cn("rounded-sm px-2 py-0.5 text-[12.5px] font-semibold", STATUS_TONE[doc.status])}>{DOCUMENT_ACCEPTANCE_LABELS[doc.status]}</span>
          </li>
        ))}
      </Panel>
    </PanelSection>
  );
}
