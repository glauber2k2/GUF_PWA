"use client";

import type { ReactNode } from "react";
import { CalendarX } from "lucide-react";
import { Banner, EmptyState } from "@/shared/components/ds";
import { DetailHeader } from "@/shared/components/detail-header";
import { SummarySkeleton } from "./summary-skeleton";

export type SummaryFallbackState = "loading" | "missing" | "error";

export interface SummaryFallbackProps {
  state: SummaryFallbackState;
  onBack: () => void;
  onRetry: () => void;
  /** Mensagem do erro (padrão: falha de carregamento genérica). */
  errorMessage?: string;
  /** Avisos acima do conteúdo (ex.: sem conexão); não aparecem em "não encontrado". */
  notices?: ReactNode;
}

const DEFAULT_ERROR = "Não foi possível carregar o treino. Verifique a internet e tente de novo.";

/** Resumo sem dados ainda: carregando (skeleton), treino não encontrado ou erro com "Tentar". */
export function SummaryFallback({ state, onBack, onRetry, errorMessage = DEFAULT_ERROR, notices }: SummaryFallbackProps) {
  const missing = state === "missing";
  return (
    <>
      <DetailHeader loading={state === "loading"} title={missing ? "Treino" : undefined} onBack={onBack} />
      <div className="flex flex-col gap-4 pt-2">
        {!missing && notices}
        {state === "loading" && <SummarySkeleton />}
        {missing && (
          <div className="mt-[72px] animate-guf-rise">
            <EmptyState
              icon={CalendarX}
              title="Treino não encontrado"
              message="Este treino foi excluído ou não está mais disponível."
              actionLabel="Voltar"
              onAction={onBack}
              bordered={false}
            />
          </div>
        )}
        {state === "error" && (
          <Banner tone="danger" actionLabel="Tentar" onAction={onRetry}>
            {errorMessage}
          </Banner>
        )}
      </div>
    </>
  );
}
