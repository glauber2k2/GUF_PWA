"use client";

import { MUSCLE_GROUP_ORDER, muscleGroupLabel, type MuscleGroupCode } from "@guf/core";
import { Chip } from "@guf/ui";

interface MuscleGroupFilterProps {
  selected: readonly MuscleGroupCode[];
  onChange: (selected: MuscleGroupCode[]) => void;
}

/** Filtro por grupo muscular: marca vários ao mesmo tempo; "Todos" limpa a seleção. */
export function MuscleGroupFilter({ selected, onChange }: MuscleGroupFilterProps) {
  const toggle = (code: MuscleGroupCode) =>
    onChange(selected.includes(code) ? selected.filter((c) => c !== code) : MUSCLE_GROUP_ORDER.filter((c) => c === code || selected.includes(c)));

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-[13px] font-semibold text-fg-secondary">Grupo muscular</legend>
      <div className="flex flex-wrap gap-2">
        <Chip label="Todos" selected={selected.length === 0} onChange={() => onChange([])} />
        {MUSCLE_GROUP_ORDER.map((code) => (
          <Chip key={code} label={muscleGroupLabel(code)} selected={selected.includes(code)} onChange={() => toggle(code)} />
        ))}
      </div>
    </fieldset>
  );
}
