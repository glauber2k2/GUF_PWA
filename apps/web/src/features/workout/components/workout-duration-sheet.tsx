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

/** Corrigir o tempo efetivo de um treino concluído (horas e minutos, de 1 min a 24 h). */
export function WorkoutDurationSheet({ open, seconds, onClose, onSave }: WorkoutDurationSheetProps) {
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Tempo do treino" subtitle="Tempo treinando, sem as pausas">
      {/* key: cada abertura recomeça do tempo atual. */}
      {open && <DurationForm key={seconds} seconds={seconds} onSave={onSave} />}
    </BottomSheet>
  );
}

const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 2);

function DurationForm({ seconds, onSave }: { seconds: number; onSave: (seconds: number) => void }) {
  const initial = toDurationParts(seconds);
  const [hours, setHours] = useState(String(initial.hours));
  const [minutes, setMinutes] = useState(String(initial.minutes));
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const next = toEditedDurationSeconds(Number(hours || 0), Number(minutes || 0));
    if (next === null) {
      setError("Use de 1 minuto a 24 horas (minutos de 0 a 59).");
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
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Horas"
          inputMode="numeric"
          autoComplete="off"
          value={hours}
          onChange={(e) => {
            setError(null);
            setHours(digitsOnly(e.target.value));
          }}
        />
        <TextField
          label="Minutos"
          inputMode="numeric"
          autoComplete="off"
          value={minutes}
          error={error ?? undefined}
          onChange={(e) => {
            setError(null);
            setMinutes(digitsOnly(e.target.value));
          }}
        />
      </div>
      <p className="text-[13px] leading-[18px] text-fg-muted">Na competição, vale o menor entre este tempo e o medido pelo app.</p>
      <Button type="submit" size="tall" fullWidth>
        Salvar tempo
      </Button>
    </form>
  );
}
