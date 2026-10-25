"use client";

import type { ReactNode } from "react";
import { Trophy } from "lucide-react";
import type { WorkoutSet } from "@guf/api";
import { CARDIO_RATES, cardioTotals, formatCardioRate, formatDistance, formatElapsed, type CardioRateKind, type SetField } from "@guf/core";
import { AnimatePresence, Icon, PresenceRow, SwipeToDelete } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Uma série registrada e a posição dela entre todas as séries do exercício (para editar e remover). */
export interface CardioLoggedSet {
  set: WorkoutSet;
  index: number;
  /** Série do recorde do exercício neste treino (ritmo/velocidade ou distância). */
  isRecord: boolean;
}

export interface CardioSetTableProps {
  sets: readonly CardioLoggedSet[];
  rate: CardioRateKind;
  /** Abre a folha da série (teclado do app) no campo tocado. */
  onEditField: (setIndex: number, field: SetField) => void;
  onRemove: (index: number) => void;
}

const GRID = "grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1.5 px-3";

/** Séries do cardio: tempo e km (toque para editar na folha da série) e ritmo ou velocidade; total no rodapé. */
export function CardioSetTable({ sets, rate, onEditField, onRemove }: CardioSetTableProps) {
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
        {sets.map(({ set, index, isRecord }, position) => (
          <PresenceRow key={set.id}>
            <SwipeToDelete label="Remover série" onDelete={() => onRemove(index)}>
              <div className={cn(GRID, "py-1", isRecord ? "bg-pr-highlight" : "bg-accent/10")}>
                {isRecord ? (
                  <span role="img" aria-label={`Série ${position + 1}, recorde pessoal`} className="grid place-items-center text-pr-text">
                    <Icon icon={Trophy} size={20} />
                  </span>
                ) : (
                  <span className="text-center font-display text-xl font-bold">{position + 1}</span>
                )}
                <SetCellButton label={`Tempo ${formatElapsed(set.durationSeconds ?? 0)}. Toque para editar`} onClick={() => onEditField(index, "durationSeconds")}>
                  {formatElapsed(set.durationSeconds ?? 0)}
                </SetCellButton>
                <SetCellButton
                  label={set.distanceKm ? `Distância ${formatDistance(set.distanceKm)} km. Toque para editar` : "Adicionar distância"}
                  isEmpty={!set.distanceKm}
                  onClick={() => onEditField(index, "distanceKm")}
                >
                  {set.distanceKm ? formatDistance(set.distanceKm) : "+ km"}
                </SetCellButton>
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

/** Célula editável da série (abre a folha); vazia, fica tracejada como um convite. */
function SetCellButton({ label, isEmpty = false, onClick, children }: { label: string; isEmpty?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid h-12 cursor-pointer place-items-center rounded-[10px] font-display font-semibold tabular-nums transition-[background-color,scale] duration-150 ease-standard active:scale-[.97]",
        isEmpty
          ? "border-[1.5px] border-dashed border-border-strong bg-transparent text-[15px] text-fg-muted"
          : "border-0 bg-surface-3 text-[22px] text-fg",
      )}
    >
      {children}
    </button>
  );
}
