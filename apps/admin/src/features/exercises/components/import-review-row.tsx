"use client";

import { AlertTriangle, CheckCircle2, CopyMinus, Trash2 } from "lucide-react";
import { CATALOG_IMPORT_ISSUE_TEXT, isBlockingImportIssue, type CatalogImportIssue, type CatalogImportRow } from "@guf/core";
import { cn, Icon, IconButton, TextField } from "@guf/ui";
import { EquipmentSelect, MuscleGroupSelect } from "@/features/exercises/components/exercise-fields";
import type { CatalogImportRowPatch } from "@/features/exercises/hooks/use-catalog-import";

interface ImportReviewRowProps {
  row: CatalogImportRow;
  issue: CatalogImportIssue | null;
  onChange: (patch: CatalogImportRowPatch) => void;
  onRemove: () => void;
}

function RowStatus({ issue }: { issue: CatalogImportIssue | null }) {
  if (!issue) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-success">
        <Icon icon={CheckCircle2} size={15} />
        Pronto
      </span>
    );
  }
  const blocking = isBlockingImportIssue(issue);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold", blocking ? "text-danger" : "text-fg-muted")}>
      <Icon icon={blocking ? AlertTriangle : CopyMinus} size={15} />
      {CATALOG_IMPORT_ISSUE_TEXT[issue]}
      {!blocking && <span className="font-normal"> · fica de fora</span>}
    </span>
  );
}

/** Um exercício em revisão: nome, grupo e equipamento editáveis, o que veio do arquivo e o status. */
export function ImportReviewRow({ row, issue, onChange, onRemove }: ImportReviewRowProps) {
  const blocking = issue !== null && isBlockingImportIssue(issue);
  const label = row.name || `linha ${row.line}`;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-surface p-3.5 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start md:gap-3",
        blocking ? "border-danger/50" : "border-border",
        issue && !blocking && "opacity-70",
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <TextField
          aria-label={`Nome (linha ${row.line})`}
          value={row.name}
          onChange={(event) => onChange({ name: event.target.value })}
          error={issue === "missing_name" || issue === "name_too_long" ? CATALOG_IMPORT_ISSUE_TEXT[issue] : undefined}
        />
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-fg-muted">
          <span className="tabular-nums">Linha {row.line}</span>
          <RowStatus issue={issue} />
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <MuscleGroupSelect
          label={`Grupo muscular de ${label}`}
          hideLabel
          value={row.muscleGroup}
          onChange={(muscleGroup) => onChange({ muscleGroup })}
          error={issue === "unknown_muscle" ? CATALOG_IMPORT_ISSUE_TEXT.unknown_muscle : undefined}
        />
        {!row.muscleGroup && row.sourceMuscle && <span className="truncate text-[12.5px] text-fg-muted">No arquivo: “{row.sourceMuscle}”</span>}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <EquipmentSelect
          label={`Equipamento de ${label}`}
          hideLabel
          value={row.equipment}
          onChange={(equipment) => onChange({ equipment })}
          error={issue === "unknown_equipment" ? CATALOG_IMPORT_ISSUE_TEXT.unknown_equipment : undefined}
        />
        {!row.equipment && row.sourceEquipment && <span className="truncate text-[12.5px] text-fg-muted">No arquivo: “{row.sourceEquipment}”</span>}
      </div>
      <IconButton icon={Trash2} label={`Remover ${label}`} variant="ghost" onClick={onRemove} className="self-end md:self-start" />
    </li>
  );
}
