"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { formatElapsed, maskDurationInput, parseDistanceInput, parseDurationInput, sanitizeDistanceInput } from "@guf/core";
import { Button, TextField } from "@/shared/components/ds";
import type { CardioSetEntry } from "@/features/workout/hooks/use-workout-editing";

/** Com 4 dígitos já dá para saber se os segundos passaram de 59. */
const TIME_ERROR_MIN_LENGTH = 4;

/** Registro manual (tempo lido no painel do aparelho): tempo obrigatório, km opcional. */
export function CardioManualForm({ onAdd }: { onAdd: (entry: CardioSetEntry) => void }) {
  const [time, setTime] = useState("");
  const [distance, setDistance] = useState("");
  const seconds = parseDurationInput(time);
  const timeError = time.length >= TIME_ERROR_MIN_LENGTH && seconds === null ? "Segundos vão até 59." : undefined;

  const add = () => {
    if (seconds === null) return;
    onAdd({ durationSeconds: seconds, distanceKm: parseDistanceInput(distance) });
    setTime("");
    setDistance("");
  };

  return (
    <div className="flex animate-guf-rise-fast flex-col gap-3 px-4 pt-1 pb-4 select-text">
      <div className="grid grid-cols-2 gap-2.5">
        <TextField
          label="Tempo"
          inputMode="numeric"
          placeholder="mm:ss"
          value={time}
          error={timeError}
          hint={seconds !== null ? formatElapsed(seconds) : "Ex.: 2530 = 25:30"}
          onChange={(event) => setTime(maskDurationInput(event.target.value))}
        />
        <TextField
          label="Distância (km)"
          inputMode="decimal"
          placeholder="0,0"
          value={distance}
          hint="Opcional"
          onChange={(event) => setDistance(sanitizeDistanceInput(event.target.value))}
        />
      </div>
      <Button variant="secondary" size="tall" icon={Plus} fullWidth disabled={seconds === null} onClick={add}>
        Adicionar série
      </Button>
    </div>
  );
}
