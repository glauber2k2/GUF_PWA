"use client";

import { useId } from "react";
import { EQUIPMENT_CODES, equipmentLabel, MUSCLE_GROUP_ORDER, muscleGroupLabel, type EquipmentCode, type MuscleGroupCode } from "@guf/core";
import { cn } from "@guf/ui";

const SELECT =
  "h-11 w-full min-w-0 cursor-pointer rounded-md border bg-surface-3 px-3 text-fg outline-none focus:border-focus focus:shadow-focus";

interface SelectProps<T extends string> {
  label: string;
  value: T | null;
  onChange: (value: T) => void;
  /** Rótulo só para leitor de tela (linhas da tabela de revisão). */
  hideLabel?: boolean;
  error?: string;
}

function CodeSelect<T extends string>({ label, value, onChange, hideLabel, error, options }: SelectProps<T> & { options: Array<{ value: T; label: string }> }) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={cn("text-[13px] font-semibold text-fg-secondary", hideLabel && "sr-only")}>
        {label}
      </label>
      <select
        id={id}
        value={value ?? ""}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(SELECT, error ? "border-danger" : "border-border-strong")}
      >
        {value === null && (
          <option value="" disabled>
            Escolha…
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && !hideLabel && <span className="text-[13px] text-danger">{error}</span>}
    </div>
  );
}

const MUSCLE_OPTIONS = MUSCLE_GROUP_ORDER.map((code) => ({ value: code, label: muscleGroupLabel(code) }));
const EQUIPMENT_OPTIONS = EQUIPMENT_CODES.map((code) => ({ value: code, label: equipmentLabel(code) }));

export function MuscleGroupSelect(props: SelectProps<MuscleGroupCode>) {
  return <CodeSelect {...props} options={MUSCLE_OPTIONS} />;
}

export function EquipmentSelect(props: SelectProps<EquipmentCode>) {
  return <CodeSelect {...props} options={EQUIPMENT_OPTIONS} />;
}
