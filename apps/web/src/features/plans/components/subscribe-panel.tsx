"use client";

import { useState, type FormEvent } from "react";
import { Crown } from "lucide-react";
import { legalDocumentArticle, legalDocumentLabel, type CatalogPlan } from "@guf/core";
import type { LegalDocument } from "@guf/api";
import { Banner, Button, Checkbox } from "@/shared/components/ds";
import { LegalDocLink } from "@/features/legal";

export interface SubscribePanelProps {
  plan: CatalogPlan;
  /** Documentos a aceitar agora (Termos da Assinatura + pendências do cadastro). */
  documents: LegalDocument[];
  documentsError: string | null;
  onRetryDocuments: () => void;
  canSubscribe: boolean;
  subscribing: boolean;
  onSubscribe: (acceptedDocumentIds: string[]) => void;
}

/**
 * Assinar (aceites agrupados, LGPD e CDC): TODOS os documentos pendentes numa única confirmação,
 * desmarcada, só no momento da assinatura. Ler nunca marca a caixa.
 */
export function SubscribePanel({
  plan,
  documents,
  documentsError,
  onRetryDocuments,
  canSubscribe,
  subscribing,
  onSubscribe,
}: SubscribePanelProps) {
  const [accepted, setAccepted] = useState(false);
  const needsAcceptance = documents.length > 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (needsAcceptance && !accepted) return;
    onSubscribe(documents.map((d) => d.id));
  };

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border border-border-strong bg-surface p-4">
      <h2 className="m-0 text-lg leading-6 font-bold">Assinar o {plan.name}</h2>
      <p className="m-0 text-sm leading-5 text-fg-secondary">
        O preço, a forma de cobrança e a renovação aparecem antes de qualquer cobrança. Cancele quando quiser.
      </p>
      {documentsError ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={onRetryDocuments}>
          {documentsError}
        </Banner>
      ) : (
        needsAcceptance && (
          <Checkbox checked={accepted} onChange={(e) => setAccepted(e.target.checked)}>
            Li e aceito
            {documents.map((doc, index) => (
              <span key={doc.id}>
                {index > 0 && (index === documents.length - 1 ? " e" : ",")} {legalDocumentArticle(doc.doc_type)}{" "}
                <LegalDocLink docType={doc.doc_type} url={doc.url} className="font-semibold text-accent-text underline">
                  {legalDocumentLabel(doc.doc_type)}
                </LegalDocLink>
              </span>
            ))}
          </Checkbox>
        )
      )}
      <Button
        type="submit"
        size="lg"
        fullWidth
        sheen
        icon={Crown}
        loading={subscribing}
        disabled={!canSubscribe || documentsError !== null || (needsAcceptance && !accepted)}
      >
        Assinar o {plan.name}
      </Button>
    </form>
  );
}
