"use client";

import { useState, type FormEvent } from "react";
import { Crown } from "lucide-react";
import { formatIntervalSuffix, formatMoney, formatPlanPeriodName, legalDocumentArticle, legalDocumentLabel, type CatalogPlan, type PlanPrice } from "@guf/core";
import type { LegalDocument } from "@guf/api";
import { Banner, Button, Checkbox } from "@/shared/components/ds";
import { BOTTOM_BAR_PROPS } from "@/shared/hooks/use-bottom-clearance";
import { LegalDocLink } from "@/features/legal";

/** Espaço que a tela deixa no fim para o conteúdo não ficar atrás da barra (com a caixa dos termos). */
export const SUBSCRIBE_BAR_CLEARANCE = "pb-[calc(220px+env(safe-area-inset-bottom))]";

export interface SubscribeBarProps {
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
  /** Mostra "Pro mensal · R$ 14,80/mês" acima do botão (tela do Pro, onde o preço não fica sempre à vista). */
  showSummary?: boolean;
}

/**
 * Barra fixa de assinar (zona do polegar). Aceites agrupados (LGPD e CDC): TODOS os documentos
 * pendentes numa única confirmação, desmarcada, só no momento da assinatura. Ler nunca marca a caixa.
 */
export function SubscribeBar({
  plan,
  price,
  documents,
  documentsError,
  onRetryDocuments,
  canSubscribe,
  subscribing,
  onSubscribe,
  showSummary = false,
}: SubscribeBarProps) {
  const [accepted, setAccepted] = useState(false);
  const needsAcceptance = documents.length > 0;
  const amount = price ? formatMoney(price.amountCents, price.currency) : null;
  const suffix = price ? formatIntervalSuffix(price.interval) : "";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (needsAcceptance && !accepted) return;
    onSubscribe(documents.map((d) => d.id));
  };

  return (
    <form
      {...BOTTOM_BAR_PROPS}
      noValidate
      onSubmit={onSubmit}
      className="fixed inset-x-0 bottom-0 z-10 animate-guf-rise border-t border-border bg-background/90 backdrop-blur-[12px] [animation-delay:400ms]"
    >
      <div className="mx-auto flex max-w-[430px] flex-col gap-2.5 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
        {showSummary && price && amount && (
          <p className="m-0 flex items-baseline justify-between gap-2">
            <span className="text-[13px] text-fg-secondary">{formatPlanPeriodName(plan.name, price.interval)}</span>
            <strong className="font-display text-[22px] font-bold tabular-nums">
              {amount}
              <span className="font-sans text-[13px] font-medium text-fg-secondary">{suffix}</span>
            </strong>
          </p>
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
          {amount ? `Assinar ${plan.name} por ${amount}${suffix}` : "Assinatura em breve"}
        </Button>
        <span className="text-center text-xs leading-4 text-fg-muted">
          {price ? "Renova automaticamente · cancele quando quiser, aqui no app" : `Avisaremos quando o ${plan.name} puder ser assinado.`}
        </span>
      </div>
    </form>
  );
}
