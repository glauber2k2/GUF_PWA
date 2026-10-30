"use client";

import { useState, type FormEvent } from "react";
import { Crown } from "lucide-react";
import { formatPlanPrice, legalDocumentArticle, legalDocumentLabel, type CatalogPlan, type PlanPrice } from "@guf/core";
import type { LegalDocument } from "@guf/api";
import { Banner, Button, Checkbox } from "@/shared/components/ds";
import { LegalDocLink } from "@/features/legal";

export interface SubscribePanelProps {
  plan: CatalogPlan;
  /** Preço à venda (null = ainda sem preço: a assinatura fica indisponível). */
  price: PlanPrice | null;
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
  price,
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
      {price ? (
        <>
          <p className="m-0 font-display text-2xl leading-8 font-bold tabular-nums">{formatPlanPrice(price)}</p>
          <p className="m-0 text-sm leading-5 text-fg-secondary">
            Renova automaticamente até você cancelar, aqui no app. Cancelando em até 7 dias da contratação, devolvemos o valor inteiro. O
            pagamento é feito na página segura do Stripe.
          </p>
        </>
      ) : (
        <p className="m-0 text-sm leading-5 text-fg-secondary">A assinatura ainda não está disponível. Avisaremos quando o {plan.name} puder ser assinado.</p>
      )}
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
        disabled={!price || !canSubscribe || documentsError !== null || (needsAcceptance && !accepted)}
      >
        Assinar o {plan.name}
      </Button>
    </form>
  );
}
