"use client";

import { useCallback, useEffect, useState } from "react";
import { MAX_SET_DURATION_SECONDS } from "@guf/core";

/**
 * Cronômetro de uma série de cardio. Guarda só marcos (tempo já contado + quando voltou a contar):
 * o tempo é sempre calculado, então segue certo com a tela apagada ou a página recarregada.
 */
export interface CardioStopwatchRun {
  sessionId: string;
  exerciseId: string;
  /** Tempo contado antes do trecho atual (pausas não entram). */
  accumulatedMs: number;
  /** Date.now() ao iniciar ou continuar; null = pausado. */
  resumedAt: number | null;
}

/** Série registrada ao parar. */
export interface CardioStopwatchResult {
  exerciseId: string;
  seconds: number;
}

export interface CardioStopwatch {
  running: CardioStopwatchRun | null;
  /** Tempo contado (ms), para o anel andar suave; 0 parado. */
  elapsedMs: number;
  start: (exerciseId: string) => void;
  pause: () => void;
  resume: () => void;
  /** Para e devolve o exercício e o tempo (para gravar); null se não estava contando. */
  stop: () => CardioStopwatchResult | null;
  /** Descarta sem gravar (tempo descartado, exercício removido). */
  cancel: () => void;
}

const STORAGE_KEY = "guf.cardio-stopwatch";
/** Atualiza 4 vezes por segundo: o anel (uma volta por minuto) anda sem saltos. */
const TICK_MS = 250;

/** Formato salvo até 2026-10-23 (contava numa série já existente, sem pausa). */
interface LegacyRun {
  sessionId: string;
  exerciseId: string;
  startedAt: number;
}

function readRun(sessionId: string): CardioStopwatchRun | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<CardioStopwatchRun & LegacyRun>;
    if (saved.sessionId !== sessionId || !saved.exerciseId) return null;
    if (typeof saved.accumulatedMs === "number") return saved as CardioStopwatchRun;
    // Cronômetro antigo, ainda contando: continua de onde estava.
    return typeof saved.startedAt === "number" ? { sessionId, exerciseId: saved.exerciseId, accumulatedMs: 0, resumedAt: saved.startedAt } : null;
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

function elapsedOf(run: CardioStopwatchRun, now: number): number {
  const total = run.accumulatedMs + (run.resumedAt === null ? 0 : Math.max(0, now - run.resumedAt));
  return Math.min(MAX_SET_DURATION_SECONDS * 1000, total);
}

/** Cronômetro do cardio no treino em andamento: um por vez, com pausa. */
export function useCardioStopwatch(sessionId: string): CardioStopwatch {
  // A tela do treino monta este hook já no navegador (depois de carregar o treino): pode ler o aparelho.
  const [running, setRunning] = useState<CardioStopwatchRun | null>(() => readRun(sessionId));
  const [now, setNow] = useState(() => Date.now());
  const isTicking = running !== null && running.resumedAt !== null;

  useEffect(() => {
    if (!isTicking) return;
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [isTicking]);

  const save = useCallback((run: CardioStopwatchRun | null) => {
    writeRun(run);
    setNow(Date.now());
    setRunning(run);
  }, []);

  const start = useCallback(
    (exerciseId: string) => save({ sessionId, exerciseId, accumulatedMs: 0, resumedAt: Date.now() }),
    [save, sessionId],
  );

  const pause = useCallback(() => {
    if (!running || running.resumedAt === null) return;
    save({ ...running, accumulatedMs: elapsedOf(running, Date.now()), resumedAt: null });
  }, [running, save]);

  const resume = useCallback(() => {
    if (!running || running.resumedAt !== null) return;
    save({ ...running, resumedAt: Date.now() });
  }, [running, save]);

  const stop = useCallback(() => {
    if (!running) return null;
    const seconds = Math.max(1, Math.round(elapsedOf(running, Date.now()) / 1000));
    save(null);
    return { exerciseId: running.exerciseId, seconds };
  }, [running, save]);

  const cancel = useCallback(() => save(null), [save]);

  return { running, elapsedMs: running ? elapsedOf(running, now) : 0, start, pause, resume, stop, cancel };
}
