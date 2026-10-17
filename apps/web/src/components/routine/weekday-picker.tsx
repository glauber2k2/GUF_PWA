"use client";

import { WEEKDAYS, weekdaysLabel, type IsoWeekday } from "@guf/core";
import { cn } from "@/lib/utils";

export interface WeekdayPickerProps {
  /** Dias da rotina (ISO do banco: 1 = segunda … 7 = domingo; exibidos de domingo a sábado). */
  value: readonly number[];
  /** Outras rotinas do projeto por dia (bolinha e aviso: o dia já tem treino). */
  otherRoutines: ReadonlyMap<number, string[]>;
  disabled: boolean;
  onToggle: (day: IsoWeekday) => void;
}

/** Dias da semana em que a rotina é feita: a Início mostra o treino de hoje por eles. */
export function WeekdayPicker({ value, otherRoutines, disabled, onToggle }: WeekdayPickerProps) {
  const hasOthers = otherRoutines.size > 0;
  const hint =
    value.length === 0
      ? "Opcional. Sem dias marcados, a Início sugere pela ordem das rotinas."
      : "A Início mostra esta rotina como o treino de hoje nos dias marcados.";

  return (
    <div role="group" aria-labelledby="dias-label" className="flex flex-none flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span id="dias-label" className="text-[13px] font-medium text-fg-secondary">
          Dias da semana
        </span>
        <span aria-live="polite" className={cn("text-[13px] font-semibold", value.length ? "text-accent-text" : "text-fg-muted")}>
          {weekdaysLabel(value)}
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((d) => {
          const on = value.includes(d.iso);
          const others = otherRoutines.get(d.iso);
          return (
            <button
              key={d.iso}
              type="button"
              aria-pressed={on}
              aria-label={`${d.long}${others ? `, também tem ${others.join(" e ")}` : ""}`}
              disabled={disabled}
              onClick={() => onToggle(d.iso)}
              className={cn(
                "flex h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border text-sm font-semibold",
                "transition-[background-color,border-color,transform] duration-150 ease-standard active:scale-[.94] motion-reduce:active:scale-100",
                "disabled:cursor-not-allowed disabled:opacity-50",
                on ? "border-accent bg-accent text-accent-foreground" : "border-border-strong bg-background text-fg hover:border-fg-muted",
              )}
            >
              <span>{d.initial}</span>
              <span
                aria-hidden="true"
                className={cn("size-[5px] rounded-pill", others ? (on ? "bg-accent-foreground" : "bg-fg-muted") : "bg-transparent")}
              />
            </button>
          );
        })}
      </div>
      <span className="flex items-center gap-1.5 text-xs leading-4 text-pretty text-fg-muted">
        {hasOthers && <span aria-hidden="true" className="size-[5px] flex-none rounded-pill bg-fg-muted" />}
        {hasOthers ? `Outra rotina do projeto nesse dia. ${hint}` : hint}
      </span>
    </div>
  );
}
