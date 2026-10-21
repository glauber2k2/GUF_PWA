"use client";

import { adjustLoad, parseKeypadValue, toKeypadValue, type SetFieldDefinition, type SetFieldShortcuts, type WeightUnit } from "@guf/core";
import { NumericKeypad, QuickLoad, QuickReps, Stepper } from "@/shared/components/ds";

export interface SetFieldEditorProps {
  /** Campo editado (carga, repetições, distância, tempo): rótulos, passo, atalhos e teclado. */
  definition: SetFieldDefinition;
  /** Valor na unidade exibida (kg/lb, minutos…); null = vazio. */
  value: number | null;
  unit: WeightUnit;
  /** Teclado numérico no lugar dos botões. */
  isTyping: boolean;
  /** Texto digitado no teclado (null = mostra o valor atual, que o 1º dígito substitui). */
  typed: string | null;
  onTypedChange: (text: string) => void;
  onStartTyping: () => void;
  /** Novo valor na unidade exibida. */
  onChange: (value: number) => void;
}

/** Edita uma medida da série: Stepper + atalhos, ou teclado numérico em que o 1º dígito substitui o valor. */
export function SetFieldEditor({ definition, value, unit, isTyping, typed, onTypedChange, onStartTyping, onChange }: SetFieldEditorProps) {
  const label = definition.label(unit);

  if (isTyping) {
    return (
      <NumericKeypad
        // Trocar de campo recomeça a digitação (o 1º dígito volta a substituir).
        key={definition.key}
        replaceOnFirstKey
        value={typed ?? toKeypadValue(value)}
        unit={definition.keypadUnit(unit)}
        label={label}
        onChange={(text) => {
          onTypedChange(text);
          onChange(parseKeypadValue(text));
        }}
      />
    );
  }

  return (
    <>
      <Stepper
        label={label}
        value={value ?? 0}
        step={definition.step(unit)}
        min={0}
        onChange={onChange}
        decreaseLabel={definition.decreaseLabel}
        increaseLabel={definition.increaseLabel}
        onValueClick={onStartTyping}
        valueClickLabel={definition.typeLabel}
      />
      <span className="-mt-1 text-center text-xs text-fg-muted">Toque no número para digitar</span>
      <SetFieldShortcutButtons shortcuts={definition.shortcuts} value={value} onChange={onChange} />
    </>
  );
}

/** Atalhos do campo: somam ao valor (carga, distância, tempo) ou o substituem (repetições). */
function SetFieldShortcutButtons({ shortcuts, value, onChange }: { shortcuts: SetFieldShortcuts; value: number | null; onChange: (value: number) => void }) {
  if (shortcuts.mode === "set") return <QuickReps options={shortcuts.values} value={value} onSelect={onChange} />;
  return <QuickLoad options={[...shortcuts.options]} onSelect={(delta) => onChange(adjustLoad(value, delta))} />;
}
