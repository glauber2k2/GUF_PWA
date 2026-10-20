"use client";

import { useState } from "react";
import { Minus } from "lucide-react";
import { adjustLoad, parseKeypadValue, previousLabel, toDisplayWeight, toKeypadValue, type WeightUnit } from "@guf/core";
import type { WorkoutSet } from "@guf/api";
import { BottomSheet, Button, NumericKeypad, QuickLoad, QuickReps, SegmentedControl, Stepper } from "@/shared/components/ds";
import type { EditableField } from "@/features/workout/helpers/workout-state";

export interface SetEditSheetProps {
  open: boolean;
  /** "Série 2 · Puxada frontal" */
  title: string;
  /** Série com peso em kg (como no banco). */
  set: WorkoutSet | null;
  field: EditableField;
  /** Unidade de exibição/edição (a conversão para kg é feita por quem recebe onValueChange). */
  unit: WeightUnit;
  onFieldChange: (field: EditableField) => void;
  /** Valor na unidade de exibição (carga) ou repetições. */
  onValueChange: (field: EditableField, value: number) => void;
  /** Fecha e salva (as mudanças já aparecem na linha enquanto edita). */
  onDone: () => void;
}

/**
 * Editar carga/repetições de uma série: Stepper + atalhos (carga: −1/+1/+5/+10 somam; repetições:
 * 6/8/10/12/15 substituem), ou teclado numérico em que o primeiro dígito substitui o valor atual.
 */
export function SetEditSheet({ open, title, set, field, unit, onFieldChange, onValueChange, onDone }: SetEditSheetProps) {
  const [keypad, setKeypad] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const isLoad = field === "weightKg";
  const loadLabel = `Carga (${unit})`;
  const displayLoad = toDisplayWeight(set?.weightKg ?? null, unit);
  const value = isLoad ? (displayLoad ?? 0) : (set?.reps ?? 0);

  const close = () => {
    setKeypad(false);
    setTyped(null);
    onDone();
  };

  const previous = set?.previous ? { weightKg: toDisplayWeight(set.previous.weightKg, unit), reps: set.previous.reps } : null;

  return (
    <BottomSheet placement="screen" open={open} onClose={close} title={title} subtitle={`Anterior: ${previousLabel(previous)}`}>
      <SegmentedControl
        options={[
          { value: "weightKg", label: loadLabel },
          { value: "reps", label: "Repetições" },
        ]}
        value={field}
        onChange={(v) => {
          setTyped(null);
          onFieldChange(v as EditableField);
        }}
        label="Campo da série"
      />
      {keypad ? (
        <NumericKeypad
          // Trocar de campo recomeça a digitação (o 1º dígito volta a substituir).
          key={field}
          replaceOnFirstKey
          value={typed ?? toKeypadValue(isLoad ? displayLoad : (set?.reps ?? null))}
          unit={isLoad ? unit : "reps"}
          label={isLoad ? loadLabel : "Repetições"}
          onChange={(text) => {
            setTyped(text);
            onValueChange(field, parseKeypadValue(text));
          }}
        />
      ) : (
        <>
          <Stepper
            label={isLoad ? loadLabel : "Repetições"}
            value={value}
            step={isLoad ? (unit === "lb" ? 5 : 2) : 1}
            min={0}
            onChange={(v) => onValueChange(field, v)}
            decreaseLabel={isLoad ? "Diminuir carga" : "Menos uma repetição"}
            increaseLabel={isLoad ? "Aumentar carga" : "Mais uma repetição"}
            onValueClick={() => {
              setTyped(null);
              setKeypad(true);
            }}
            valueClickLabel={isLoad ? "Digitar carga" : "Digitar repetições"}
          />
          <span className="-mt-1 text-center text-xs text-fg-muted">Toque no número para digitar</span>
          {isLoad ? (
            <QuickLoad onSelect={(delta) => onValueChange(field, adjustLoad(displayLoad, delta))} />
          ) : (
            <QuickReps value={set?.reps ?? null} onSelect={(reps) => onValueChange(field, reps)} />
          )}
        </>
      )}
      <div className={keypad ? "grid grid-cols-[auto_minmax(0,1fr)] gap-2 pt-1" : "grid pt-1"}>
        {keypad && (
          <Button
            variant="ghost"
            size="tall"
            icon={Minus}
            onClick={() => {
              setTyped(null);
              setKeypad(false);
            }}
          >
            Usar botões
          </Button>
        )}
        <Button size="tall" fullWidth onClick={close}>
          Salvar
        </Button>
      </div>
    </BottomSheet>
  );
}
