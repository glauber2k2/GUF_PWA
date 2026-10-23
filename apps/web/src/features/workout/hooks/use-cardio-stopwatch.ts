"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_SET_DURATION_SECONDS } from "@guf/core";

/** Cronômetro de uma série de cardio: guarda só o início (o tempo é sempre "agora − início"). */
export interface CardioStopwatchRun {
  sessionId: string;
  exerciseId: string;
  setId: string;
  /** Date.now() ao tocar no play. */
  startedAt: number;
}

export interface CardioStopwatch {
  running: CardioStopwatchRun | null;
  /** Segundos desde o play (0 parado). */
  elapsedSeconds: number;
  start: (exerciseId: string, setId: string) => void;
  /** Para e devolve a série e o tempo (para gravar); null se não estava contando. */
  stop: () => (CardioStopwatchRun & { seconds: number }) | null;
  /** Descarta sem gravar (ex.: a série foi removida). */
  cancel: () => void;
}

const STORAGE_KEY = "guf.cardio-stopwatch";
const TICK_MS = 1000;

function readRun(sessionId: string): CardioStopwatchRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const run = raw ? (JSON.parse(raw) as CardioStopwatchRun) : null;
    return run?.sessionId === sessionId ? run : null;
  } catch {
    return null;
  }
}

function writeRun(run: CardioStopwatchRun | null) {
  try {
    if (run) localStorage.setItem(STORAGE_KEY, JSON.stringify(run));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem armazenamento (aba privada): o cronômetro funciona enquanto a tela estiver aberta.
  }
}

/** Apaga o cronômetro guardado no aparelho (fim do treino e saída da conta: nada do treino fica para trás). */
export function clearCardioStopwatch() {
  writeRun(null);
}

function secondsSince(startedAt: number, now: number): number {
  return Math.min(MAX_SET_DURATION_SECONDS, Math.max(0, Math.floor((now - startedAt) / 1000)));
}

/**
 * Cronômetro do cardio no treino em andamento: um por vez. O início fica no aparelho, então o tempo
 * continua certo com a tela apagada, o treino minimizado ou a página recarregada.
 */
export function useCardioStopwatch(sessionId: string): CardioStopwatch {
  // A tela do treino monta este hook já no navegador (depois de carregar o treino): pode ler o aparelho.
  const [running, setRunning] = useState<CardioStopwatchRun | null>(() => readRun(sessionId));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [running]);

  const elapsedSeconds = running ? secondsSince(running.startedAt, now) : 0;

  const start = useCallback(
    (exerciseId: string, setId: string) => {
      const run = { sessionId, exerciseId, setId, startedAt: Date.now() };
      writeRun(run);
      setNow(run.startedAt);
      setRunning(run);
    },
    [sessionId],
  );

  const stop = useCallback(() => {
    if (!running) return null;
    writeRun(null);
    setRunning(null);
    return { ...running, seconds: secondsSince(running.startedAt, Date.now()) };
  }, [running]);

  const cancel = useCallback(() => {
    writeRun(null);
    setRunning(null);
  }, []);

  return { running, elapsedSeconds, start, stop, cancel };
}
