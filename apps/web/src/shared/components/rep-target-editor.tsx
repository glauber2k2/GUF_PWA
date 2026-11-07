"use client";

import { Equal, MoveHorizontal } from "lucide-react";
import {
  buildRepTarget,
  DEFAULT_REP_TARGET,
  rangeMaxFloor,
  rangeMinCeiling,
  REP_TARGET_MAX,
  REP_TARGET_MIN,
  repModeOf,
  repTargetHint,
  switchRepMode,
  type RepMode,
  type RepTarget,
} from "@guf/core";
import { SegmentedControl, Stepper, type SegmentOption } from "@/shared/components/ds";

const REP_MODE_OPTIONS: SegmentOption[] = [
  { value: "fixed", label: "Fixas", icon: Equal },
  { value: "range", label: "Faixa", icon: MoveHorizontal },
];

const EMPTY_HINT = "Opcional. Escolha repetições fixas ou uma faixa.";

function toRepMode(value: string): RepMode {
  return value === "range" ? "range" : "fixed";
}

export interface RepTargetEditorProps {
  /** null = ainda não definidas (ficha sem repetições, rotina antiga): nenhum modo marcado. */
  value: RepTarget | null;
  onChange: (value: RepTarget) => void;
}

/**
 * Repetições de um exercício planejado (Claude Design "Editor de Rotina" · 1a): Fixas ou Faixa
 * logo acima dos números. Usado no editor de rotina e na revisão da ficha importada.
 */
export function RepTargetEditor({ value, onChange }: RepTargetEditorProps) {
  const mode = value ? repModeOf(value) : null;
  const pickMode = (next: string) => onChange(switchRepMode(value ?? DEFAULT_REP_TARGET, toRepMode(next)));

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[13px] font-medium text-fg-secondary">Repetições</span>
      <SegmentedControl label="Tipo de repetição" options={REP_MODE_OPTIONS} value={mode ?? ""} onChange={pickMode} />
      {value && mode === "fixed" && <FixedRepsField value={value} onChange={onChange} />}
      {value && mode === "range" && <RangeRepsFields value={value} onChange={onChange} />}
      <span className="text-xs leading-4 text-pretty text-fg-muted">{value ? repTargetHint(value) : EMPTY_HINT}</span>
    </div>
  );
}

function FixedRepsField({ value, onChange }: { value: RepTarget; onChange: (value: RepTarget) => void }) {
  return (
    <Stepper
      label="Repetições por série"
      value={value.min}
      step={1}
      min={REP_TARGET_MIN}
      max={REP_TARGET_MAX}
      onChange={(reps) => onChange(buildRepTarget(reps, null))}
      decreaseLabel="Menos uma repetição"
      increaseLabel="Mais uma repetição"
      className="animate-guf-rise-fast"
    />
  );
}

/** Mínimo e máximo: cada um para um antes do outro (a faixa nunca vira repetição fixa sem querer). */
function RangeRepsFields({ value, onChange }: { value: RepTarget; onChange: (value: RepTarget) => void }) {
  return (
    <div className="grid animate-guf-rise-fast grid-cols-2 gap-3">
      <Stepper
        label="Mínimo"
        value={value.min}
        step={1}
        min={REP_TARGET_MIN}
        max={rangeMinCeiling(value)}
        onChange={(min) => onChange(buildRepTarget(min, value.max))}
        decreaseLabel="Diminuir mínimo"
        increaseLabel="Aumentar mínimo"
      />
      <Stepper
        label="Máximo"
        value={value.max ?? value.min}
        step={1}
        min={rangeMaxFloor(value)}
        max={REP_TARGET_MAX}
        onChange={(max) => onChange(buildRepTarget(value.min, max))}
        decreaseLabel="Diminuir máximo"
        increaseLabel="Aumentar máximo"
      />
    </div>
  );
}
