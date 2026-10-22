"use client";

import { Ellipsis } from "lucide-react";
import type { MeasurementRecordRow } from "@guf/core";
import { AnimatePresence, IconButton, PresenceRow } from "@/shared/components/ds";

interface MeasurementRecordsProps {
  rows: MeasurementRecordRow[];
  /** Três pontinhos do registro: editar ou excluir (menu, para não apagar sem querer). */
  onOpenMenu: (row: MeasurementRecordRow) => void;
}

/** Registros do lado escolhido (mais recente primeiro); o outro lado aparece em cinza. */
export function MeasurementRecords({ rows, onOpenMenu }: MeasurementRecordsProps) {
  return (
    <section aria-labelledby="medidas-registros" className="flex flex-col gap-2.5">
      <h2 id="medidas-registros" className="m-0 text-base leading-[22px] font-bold">
        Registros
      </h2>
      {rows.length === 0 ? (
        <p className="m-0 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-fg-secondary">Nenhum registro deste lado ainda.</p>
      ) : (
        <div role="list" className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <PresenceRow key={row.measuredOn} className="border-b border-border last:border-b-0">
                <div role="listitem" className="flex min-h-14 items-center gap-3 py-2 pr-1 pl-4">
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className="text-sm leading-5 font-semibold">{row.dateLabel}</span>
                    {row.other && <span className="text-xs leading-4 text-fg-muted tabular-nums">{row.other}</span>}
                  </span>
                  <span className="text-xs leading-4 font-semibold whitespace-nowrap text-fg-secondary tabular-nums">{row.delta}</span>
                  <span className="min-w-16 text-right font-display text-xl leading-6 font-semibold whitespace-nowrap tabular-nums">{row.value}</span>
                  <IconButton icon={Ellipsis} variant="ghost" label={`Opções do registro de ${row.dateLabel}`} onClick={() => onOpenMenu(row)} />
                </div>
              </PresenceRow>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
