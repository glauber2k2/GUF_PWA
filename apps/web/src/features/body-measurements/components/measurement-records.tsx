"use client";

import type { MeasurementRecordRow } from "@guf/core";
import { AnimatePresence, PresenceRow, SwipeToDelete } from "@/shared/components/ds";

interface MeasurementRecordsProps {
  rows: MeasurementRecordRow[];
  /** Arrastar para o lado apaga o registro; ausente (sem internet) = linhas fixas. */
  onRemove?: (measuredOn: string) => void;
}

/** Registros do lado escolhido (mais recente primeiro); o outro lado aparece em cinza. */
export function MeasurementRecords({ rows, onRemove }: MeasurementRecordsProps) {
  return (
    <section aria-labelledby="medidas-registros" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="medidas-registros" className="m-0 text-base leading-[22px] font-bold">
          Registros
        </h2>
        {onRemove && rows.length > 0 && <span className="text-xs leading-4 text-fg-muted">Arraste para o lado para apagar</span>}
      </div>
      {rows.length === 0 ? (
        <p className="m-0 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-fg-secondary">Nenhum registro deste lado ainda.</p>
      ) : (
        <div role="list" className="relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
          <AnimatePresence initial={false}>
            {rows.map((row) => (
              <PresenceRow key={row.measuredOn} className="border-b border-border last:border-b-0">
                <div role="listitem">
                  {onRemove ? (
                    <SwipeToDelete label="Apagar registro" onDelete={() => onRemove(row.measuredOn)}>
                      <RecordLine row={row} />
                    </SwipeToDelete>
                  ) : (
                    <RecordLine row={row} />
                  )}
                </div>
              </PresenceRow>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function RecordLine({ row }: { row: MeasurementRecordRow }) {
  return (
    <div className="flex min-h-14 items-center gap-3 bg-surface px-4 py-2">
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="text-sm leading-5 font-semibold">{row.dateLabel}</span>
        {row.other && <span className="text-xs leading-4 text-fg-muted tabular-nums">{row.other}</span>}
      </span>
      <span className="text-xs leading-4 font-semibold whitespace-nowrap text-fg-secondary tabular-nums">{row.delta}</span>
      <span className="min-w-16 text-right font-display text-xl leading-6 font-semibold whitespace-nowrap tabular-nums">{row.value}</span>
    </div>
  );
}
