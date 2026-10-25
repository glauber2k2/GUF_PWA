"use client";

import { EQUIPMENT_CODES, equipmentLabel, MUSCLE_GROUP_ORDER, muscleGroupLabel, type EquipmentCode, type MuscleGroupCode } from "@guf/core";
import { SelectField } from "@guf/ui";

interface CodeSelectProps<T extends string> {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  /** Rótulo só para leitor de tela (linhas da tabela de revisão). */
  hideLabel?: boolean;
  error?: string;
}

const MUSCLE_OPTIONS = MUSCLE_GROUP_ORDER.map((code) => ({ value: code, label: muscleGroupLabel(code) }));
const EQUIPMENT_OPTIONS = EQUIPMENT_CODES.map((code) => ({ value: code, label: equipmentLabel(code) }));

/** Grupo muscular (catálogo do banco), sobre o SelectField do design system. */
export function MuscleGroupSelect(props: CodeSelectProps<MuscleGroupCode>) {
  return <SelectField {...props} options={MUSCLE_OPTIONS} />;
}

/** Equipamento (catálogo do banco), sobre o SelectField do design system. */
export function EquipmentSelect(props: CodeSelectProps<EquipmentCode>) {
  return <SelectField {...props} options={EQUIPMENT_OPTIONS} />;
}
