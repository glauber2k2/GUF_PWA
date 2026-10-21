"use client";

import { useState } from "react";
import { Minus } from "lucide-react";
import { EMPTY_SET_VALUES, type SetMetricDefinition, type WeightUnit } from "@guf/core";
import type { WorkoutSet } from "@guf/api";
import { BottomSheet, Button, SegmentedControl } from "@/shared/components/ds";
import { SetFieldEditor } from "@/features/workout/components/set-field-editor";
import type { EditableField } from "@/features/workout/helpers/workout-state";

export interface SetEditSheetProps {
  open: boolean;
  /** "Série 2 · Puxada frontal" */
  title: string;
  /** Série como no banco (carga em kg, tempo em segundos). */
  set: WorkoutSet | null;
  /** Medidas do exercício: força (carga/repetições) ou cardio (distância/tempo). */
  metric: SetMetricDefinition;
  field: EditableField;
  /** Unidade de exibição/edição (a conversão para o banco é feita por quem recebe onValueChange). */
  unit: WeightUnit;
  onFieldChange: (field: EditableField) => void;
  /** Valor na unidade exibida (kg/lb, repetições, km, minutos). */
  onValueChange: (field: EditableField, value: number) => void;
  /** Fecha e salva (as mudanças já aparecem na linha enquanto edita). */
  onDone: () => void;
}

/** Editar as duas medidas de uma série (abas com o campo e o editor dele). */
export function SetEditSheet({ open, title, set, metric, field, unit, onFieldChange, onValueChange, onDone }: SetEditSheetProps) {
  const [isTyping, setIsTyping] = useState(false);
  const [typed, setTyped] = useState<string | null>(null);
  const definition = metric.fields.find((f) => f.key === field) ?? metric.fields[0];

  const close = () => {
    setIsTyping(false);
    setTyped(null);
    onDone();
  };

  return (
    <BottomSheet
      placement="screen"
      open={open}
      onClose={close}
      title={title}
      subtitle={`Anterior: ${metric.formatCompact(set?.previous ?? EMPTY_SET_VALUES, unit)}`}
    >
      <SegmentedControl
        options={metric.fields.map((f) => ({ value: f.key, label: f.label(unit) }))}
        value={definition.key}
        onChange={(v) => {
          setTyped(null);
          onFieldChange(v as EditableField);
        }}
        label="Campo da série"
      />
      <SetFieldEditor
        definition={definition}
        value={definition.toDisplay(set?.[definition.key] ?? null, unit)}
        unit={unit}
        isTyping={isTyping}
        typed={typed}
        onTypedChange={setTyped}
        onStartTyping={() => {
          setTyped(null);
          setIsTyping(true);
        }}
        onChange={(value) => onValueChange(definition.key, value)}
      />
      <div className={isTyping ? "grid grid-cols-[auto_minmax(0,1fr)] gap-2 pt-1" : "grid pt-1"}>
        {isTyping && (
          <Button
            variant="ghost"
            size="tall"
            icon={Minus}
            onClick={() => {
              setTyped(null);
              setIsTyping(false);
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
