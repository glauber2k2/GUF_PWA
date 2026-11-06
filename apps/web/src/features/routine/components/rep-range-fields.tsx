"use client";

import { useState } from "react";
import { parseRepRange, REP_RANGE_MAX, toTargetRepsText } from "@guf/core";
import { TextField } from "@/shared/components/ds";

const MAX_DIGITS = String(REP_RANGE_MAX).length;

function toCount(text: string): number | null {
  const value = Number.parseInt(text, 10);
  return Number.isFinite(value) && value > 0 ? Math.min(value, REP_RANGE_MAX) : null;
}

function onlyDigits(text: string): string {
  return text.replace(/\D/g, "").slice(0, MAX_DIGITS);
}

export interface RepRangeFieldsProps {
  /** Texto gravado em target_reps ("8-12", "10", "falha" ou vazio). */
  value: string;
  disabled: boolean;
  onChange: (targetReps: string) => void;
}

/**
 * Faixa de repetições do exercício (mínimo e máximo). Grava no mesmo texto de target_reps; um
 * valor antigo que não é faixa ("falha") continua salvo até a pessoa preencher os campos.
 */
export function RepRangeFields({ value, disabled, onChange }: RepRangeFieldsProps) {
  const initial = parseRepRange(value);
  // Texto local: o campo pode ficar vazio enquanto a pessoa digita.
  const [minText, setMinText] = useState(() => (initial ? String(initial.min) : ""));
  const [maxText, setMaxText] = useState(() => (initial && initial.max !== initial.min ? String(initial.max) : ""));
  const legacyText = !initial && value.trim() ? value.trim() : null;

  const update = (nextMin: string, nextMax: string) => {
    setMinText(nextMin);
    setMaxText(nextMax);
    onChange(toTargetRepsText(toCount(nextMin), toCount(nextMax)));
  };

  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
      <legend className="mb-1.5 p-0 text-[13px] font-medium text-fg-secondary">Faixa de repetições</legend>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Mínimo"
          inputMode="numeric"
          value={minText}
          placeholder="8"
          disabled={disabled}
          onChange={(e) => update(onlyDigits(e.target.value), maxText)}
        />
        <TextField
          label="Máximo"
          inputMode="numeric"
          value={maxText}
          placeholder="12"
          disabled={disabled}
          onChange={(e) => update(minText, onlyDigits(e.target.value))}
        />
      </div>
      <span className="text-xs leading-4 text-pretty text-fg-muted">
        {legacyText
          ? `Hoje está "${legacyText}". Preencha para trocar por uma faixa.`
          : "Opcional. No treino, o guf avisa quando a série ficar abaixo ou acima da faixa."}
      </span>
    </fieldset>
  );
}
