"use client";

import { useId, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { ProjectRoutine } from "@guf/api";
import { plural } from "@guf/core";
import { BottomSheet, Icon, SheetOption } from "@/shared/components/ds";

interface PlanImportRoutineTargetProps {
  /** Rotinas do projeto de destino que podem receber os exercícios. */
  routines: readonly ProjectRoutine[];
  /** null = rotina nova. */
  value: string | null;
  disabled: boolean;
  onChange: (routineId: string | null) => void;
}

/** "Enviar para": rotina nova ou uma rotina que já existe no projeto (os exercícios entram no fim dela). */
export function PlanImportRoutineTarget({ routines, value, disabled, onChange }: PlanImportRoutineTargetProps) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const valueId = useId();
  const selected = routines.find((routine) => routine.id === value);
  const choose = (routineId: string | null) => {
    onChange(routineId);
    setOpen(false);
  };

  return (
    <>
      <div className="grid gap-1.5">
        <span id={labelId} className="text-[13px] font-medium text-fg-secondary">
          Enviar para
        </span>
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-labelledby={`${labelId} ${valueId}`}
          onClick={() => setOpen(true)}
          className="flex h-12 w-full cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-background px-3.5 text-left text-base text-fg focus-visible:border-focus focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span id={valueId} className="min-w-0 flex-1 truncate">{selected ? selected.name : "Nova rotina"}</span>
          <Icon icon={ChevronDown} size={18} className="flex-none text-fg-muted" />
        </button>
      </div>
      <BottomSheet placement="screen" open={open} onClose={() => setOpen(false)} title="Enviar para">
        <div className="flex flex-col gap-2">
          <SheetOption icon={Plus} title="Nova rotina" subtitle="Cria uma rotina com estes exercícios" highlighted={value === null} onClick={() => choose(null)} />
          {routines.map((routine) => (
            <SheetOption
              key={routine.id}
              letter={routine.name.trim().charAt(0).toUpperCase()}
              title={routine.name}
              subtitle={`${plural(routine.exercises.length, "exercício", "exercícios")} · os da ficha entram no fim`}
              highlighted={routine.id === value}
              onClick={() => choose(routine.id)}
            />
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
