"use client";

import { useState, type KeyboardEvent } from "react";
import type { WorkoutSet } from "@guf/api";
import {
  CARDIO_RATES,
  cardioTotals,
  formatCardioRate,
  formatDistance,
  formatElapsed,
  parseDistanceInput,
  sanitizeDistanceInput,
  type CardioRateKind,
} from "@guf/core";
import { AnimatePresence, PresenceRow, SwipeToDelete } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Uma série registrada e a posição dela entre todas as séries do exercício (para remover). */
export interface CardioLoggedSet {
  set: WorkoutSet;
  index: number;
}

export interface CardioSetTableProps {
  sets: readonly CardioLoggedSet[];
  rate: CardioRateKind;
  /** Série com o campo de km aberto (ex.: logo depois de parar o cronômetro). */
  editingSetId: string | null;
  onEditDistance: (setId: string | null) => void;
  onSaveDistance: (setId: string, distanceKm: number | null) => void;
  onRemove: (index: number) => void;
}

const GRID = "grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5 px-3";

/** Séries do cardio: tempo, km (toque para completar) e ritmo ou velocidade; total no rodapé. */
export function CardioSetTable({ sets, rate, editingSetId, onEditDistance, onSaveDistance, onRemove }: CardioSetTableProps) {
  const totals = cardioTotals(
    sets.map(({ set }) => set),
    rate,
  );
  return (
    <div className="border-t border-border pt-2.5">
      <div className={cn(GRID, "pb-1.5 text-center text-[11px] font-semibold tracking-[0.06em] text-fg-muted uppercase")}>
        <span>Série</span>
        <span>Tempo</span>
        <span>Km</span>
        <span>{CARDIO_RATES[rate].columnLabel}</span>
      </div>
      <AnimatePresence initial={false}>
        {sets.map(({ set, index }, position) => (
          <PresenceRow key={set.id}>
            <SwipeToDelete label="Remover série" onDelete={() => onRemove(index)}>
              <div className={cn(GRID, "bg-accent/10 py-1")}>
                <span className="text-center font-display text-xl font-bold">{position + 1}</span>
                <span className="grid h-12 place-items-center rounded-[10px] bg-surface-3 font-display text-[22px] font-semibold tabular-nums">
                  {formatElapsed(set.durationSeconds ?? 0)}
                </span>
                {editingSetId === set.id ? (
                  <DistanceInput
                    initial={set.distanceKm}
                    onDone={(distanceKm) => {
                      onSaveDistance(set.id, distanceKm);
                      onEditDistance(null);
                    }}
                    onCancel={() => onEditDistance(null)}
                  />
                ) : (
                  <DistanceButton distanceKm={set.distanceKm} onClick={() => onEditDistance(set.id)} />
                )}
                <span className={cn("text-center text-sm leading-[18px] font-semibold tabular-nums", set.distanceKm ? "text-fg" : "text-fg-muted")}>
                  {formatCardioRate(rate, set)}
                </span>
              </div>
            </SwipeToDelete>
          </PresenceRow>
        ))}
      </AnimatePresence>
      <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-border px-4 pt-3 pb-3.5">
        <span className="text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">Total</span>
        <span className="flex items-baseline gap-1.5 text-sm leading-5 text-fg-secondary tabular-nums">
          <strong className="font-display text-xl font-bold text-fg">{totals.time}</strong>
          {totals.rest}
        </span>
      </div>
    </div>
  );
}

function DistanceButton({ distanceKm, onClick }: { distanceKm: number | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={distanceKm ? `Distância ${formatDistance(distanceKm)} km. Toque para editar` : "Adicionar distância"}
      className={cn(
        "grid h-12 cursor-pointer place-items-center rounded-[10px] font-display font-semibold tabular-nums transition-[background-color,scale] duration-150 ease-standard active:scale-[.97]",
        distanceKm
          ? "border-0 bg-surface-3 text-[22px] text-fg"
          : "border-[1.5px] border-dashed border-border-strong bg-transparent text-[15px] text-fg-muted",
      )}
    >
      {distanceKm ? formatDistance(distanceKm) : "+ km"}
    </button>
  );
}

/** Campo de km na própria linha: Enter ou sair do campo salva; Esc cancela; vazio apaga. */
function DistanceInput({ initial, onDone, onCancel }: { initial: number | null; onDone: (km: number | null) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial ? formatDistance(initial) : "");
  const commit = () => onDone(draft.trim() ? (parseDistanceInput(draft) ?? initial) : null);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") onCancel();
  };
  return (
    <input
      aria-label="Distância em km"
      inputMode="decimal"
      // Campo aberto por um toque do usuário (ou logo depois de parar o cronômetro): o foco vai para ele.
      autoFocus
      value={draft}
      placeholder="0,0"
      onChange={(event) => setDraft(sanitizeDistanceInput(event.target.value))}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className="h-12 w-full min-w-0 rounded-[10px] border-[1.5px] border-focus select-text bg-surface-3 text-center font-display text-[22px] font-semibold text-fg tabular-nums outline-none"
    />
  );
}
