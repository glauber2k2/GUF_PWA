"use client";

import { FileText, RotateCcw } from "lucide-react";
import type { CatalogImportIssue, CatalogImportRow } from "@guf/core";
import type { ApiError } from "@guf/api";
import { Banner, Button, Icon, Tag } from "@guf/ui";
import { ImportReviewRow } from "@/features/exercises/components/import-review-row";
import type { CatalogImportCounts, CatalogImportRowPatch } from "@/features/exercises/hooks/use-catalog-import";

interface ImportReviewStepProps {
  fileName: string;
  rows: CatalogImportRow[];
  issues: Map<string, CatalogImportIssue | null>;
  counts: CatalogImportCounts;
  isCheckingExisting: boolean;
  checkError: ApiError | null;
  onRetryCheck: () => void;
  onChange: (id: string, patch: CatalogImportRowPatch) => void;
  onRemove: (id: string) => void;
  onRemoveSkipped: () => void;
  onChangeFile: () => void;
}

/** Passo 2 · revisar a conversão: corrigir o que não foi reconhecido, remover o que não deve entrar. */
export function ImportReviewStep(props: ImportReviewStepProps) {
  const { fileName, rows, issues, counts, isCheckingExisting, checkError } = props;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <Icon icon={FileText} size={18} className="flex-none text-fg-muted" />
          <strong className="truncate">{fileName}</strong>
        </span>
        <Button variant="ghost" icon={RotateCcw} onClick={props.onChangeFile}>
          Trocar arquivo
        </Button>
      </div>

      <div aria-live="polite" className="flex flex-wrap gap-2">
        <Tag>{counts.ready === 1 ? "1 pronto" : `${counts.ready} prontos`}</Tag>
        {counts.blocking > 0 && <Tag className="bg-banner-danger text-danger">{counts.blocking === 1 ? "1 precisa de ajuste" : `${counts.blocking} precisam de ajuste`}</Tag>}
        {counts.skipped > 0 && <Tag tone="muted">{counts.skipped === 1 ? "1 fica de fora" : `${counts.skipped} ficam de fora`}</Tag>}
      </div>

      {isCheckingExisting && <Banner tone="info">Conferindo quais exercícios já estão no catálogo…</Banner>}
      {checkError && (
        <Banner tone="warning" title="Não foi possível conferir o catálogo." actionLabel="Tentar de novo" onAction={props.onRetryCheck}>
          Os repetidos ficam de fora mesmo assim: o servidor confere ao cadastrar.
        </Banner>
      )}
      {counts.blocking > 0 && (
        <Banner tone="warning" title="Corrija ou remova os itens marcados em vermelho.">
          O cadastro só libera quando todos os exercícios tiverem nome, grupo muscular e equipamento.
        </Banner>
      )}
      {counts.skipped > 0 && (
        <Banner tone="info" actionLabel="Tirar da lista" onAction={props.onRemoveSkipped}>
          Exercícios que já estão no catálogo ou se repetem no arquivo não são cadastrados de novo.
        </Banner>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => (
          <ImportReviewRow
            key={row.id}
            row={row}
            issue={issues.get(row.id) ?? null}
            onChange={(patch) => props.onChange(row.id, patch)}
            onRemove={() => props.onRemove(row.id)}
          />
        ))}
      </ul>
    </div>
  );
}
