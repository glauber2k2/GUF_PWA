"use client";

import { useState } from "react";
import { Grid3x3, Minus } from "lucide-react";
import { adjustLoad, parseKeypadValue, previousLabel, toKeypadValue } from "@guf/core";
import type { WorkoutSet } from "@guf/api";
import { BottomSheet, Button, NumericKeypad, QuickLoad, SegmentedControl, Stepper } from "@/components/ds";
import type { EditableField } from "./workout-state";

const TABS = [
  { value: "weightKg", label: "Carga (kg)" },
  { value: "reps", label: "Repetições" },
];

export interface SetEditSheetProps {
  open: boolean;
  /** "Série 2 · Puxada frontal" */
  title: string;
  set: WorkoutSet | null;
  field: EditableField;
  onFieldChange: (field: EditableField) => void;
  onValueChange: (field: EditableField, value: number) => void;
  /** Fecha e salva (as mudanças já aparecem na linha enquanto edita). */
  onDone: () => void;
}

/** Editar carga/repetições de uma série: Stepper + carga rápida, ou teclado numérico. */
export function SetEditSheet({ open, title, set, field, onFieldChange, onValueChange, onDone }: SetEditSheetProps) {
  const [keypad, setKeypad] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const isKg = field === "weightKg";
  const value = set ? (set[field] ?? 0) : 0;

  const close = () => {
    setKeypad(false);
    setTyped(null);
    onDone();
  };

  return (
    <BottomSheet placement="screen" open={open} onClose={close} title={title} subtitle={`Anterior: ${previousLabel(set?.previous)}`}>
      <SegmentedControl
        options={TABS}
        value={field}
        onChange={(v) => {
          setTyped(null);
          onFieldChange(v as EditableField);
        }}
        label="Campo da série"
      />
      {keypad ? (
        <NumericKeypad
          value={typed ?? toKeypadValue(set?.[field] ?? null)}
          unit={isKg ? "kg" : "reps"}
          label={isKg ? "Carga (kg)" : "Repetições"}
          onChange={(text) => {
            setTyped(text);
            onValueChange(field, parseKeypadValue(text));
          }}
        />
      ) : (
        <>
          <Stepper
            label={isKg ? "Carga (kg)" : "Repetições"}
            value={value}
            step={isKg ? 2.5 : 1}
            min={0}
            onChange={(v) => onValueChange(field, v)}
            decreaseLabel={isKg ? "Diminuir carga" : "Menos uma repetição"}
            increaseLabel={isKg ? "Aumentar carga" : "Mais uma repetição"}
          />
          {isKg && <QuickLoad onSelect={(delta) => onValueChange(field, adjustLoad(set?.weightKg ?? null, delta))} />}
        </>
      )}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 pt-1">
        <Button
          variant="ghost"
          size="tall"
          icon={keypad ? Minus : Grid3x3}
          onClick={() => {
            setTyped(null);
            setKeypad(!keypad);
          }}
        >
          {keypad ? "Usar botões" : "Digitar valor"}
        </Button>
        <Button size="tall" fullWidth onClick={close}>
          Salvar
        </Button>
      </div>
    </BottomSheet>
  );
}
