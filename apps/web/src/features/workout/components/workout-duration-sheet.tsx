"use client";

import { useState } from "react";
import { toDurationParts, toEditedDurationSeconds } from "@guf/core";
import { BottomSheet, Button, TextField } from "@/shared/components/ds";

export interface WorkoutDurationSheetProps {
  open: boolean;
  /** Tempo efetivo atual (segundos). */
  seconds: number;
  onClose: () => void;
  onSave: (seconds: number) => void;
}

/** Corrigir o tempo efetivo de um treino concluído (horas, minutos e segundos, de 1 min a 24 h). */
export function WorkoutDurationSheet({ open, seconds, onClose, onSave }: WorkoutDurationSheetProps) {
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Tempo do treino" subtitle="Tempo treinando, sem as pausas">
      {/* key: cada abertura recomeça do tempo atual. */}
      {open && <DurationForm key={seconds} seconds={seconds} onSave={onSave} />}
    </BottomSheet>
  );
}

type DurationPart = "hours" | "minutes" | "seconds";

const DURATION_FIELDS: Array<{ part: DurationPart; label: string }> = [
  { part: "hours", label: "Horas" },
  { part: "minutes", label: "Minutos" },
  { part: "seconds", label: "Segundos" },
];

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 2);

function DurationForm({ seconds, onSave }: { seconds: number; onSave: (seconds: number) => void }) {
  const initial = toDurationParts(seconds);
  const [values, setValues] = useState<Record<DurationPart, string>>({
    hours: String(initial.hours),
    minutes: String(initial.minutes),
    seconds: String(initial.seconds),
  });
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const next = toEditedDurationSeconds(Number(values.hours || 0), Number(values.minutes || 0), Number(values.seconds || 0));
    if (next === null) {
      setError("Use de 1 minuto a 24 horas (minutos e segundos de 0 a 59).");
      return;
    }
    onSave(next);
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        {DURATION_FIELDS.map(({ part, label }) => (
          <TextField
            key={part}
            label={label}
            inputMode="numeric"
            autoComplete="off"
            value={values[part]}
            aria-invalid={error ? true : undefined}
            onChange={(e) => {
              setError(null);
              setValues((v) => ({ ...v, [part]: digitsOnly(e.target.value) }));
            }}
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="-mt-2 text-[13px] leading-[18px] text-danger">
          {error}
        </p>
      )}
      <p className="text-[13px] leading-[18px] text-fg-muted">Na competição, vale o menor entre este tempo e o medido pelo app.</p>
      <Button type="submit" size="tall" fullWidth>
        Salvar tempo
      </Button>
    </form>
  );
}
