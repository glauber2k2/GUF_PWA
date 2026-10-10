import { useSyncExternalStore } from "react";
import {
  addWorkoutExercises,
  createExercise,
  deleteSet,
  discardWorkout,
  finishWorkout,
  isNetworkError,
  pauseWorkout,
  removeWorkoutExercise,
  replaceWorkoutExercise,
  resumeWorkout,
  saveExerciseNote,
  saveSet,
  saveWorkoutNote,
  type ApiError,
} from "@guf/api";
import { getSupabaseClient } from "@/lib/supabase";
import { offlineDb, type OutboxEntry, type OutboxOp } from "./db";

/*
 * Fila de gravações do treino (offline-first).
 * - Toda alteração entra na fila e é aplicada na tela na hora.
 * - A fila é enviada EM ORDEM; erro de rede para o envio e tenta de novo depois
 *   (voltar a conexão, reabrir a aba ou a cada 20s enquanto houver pendências).
 * - As operações são idempotentes (ids gerados no aparelho), então reenviar não duplica.
 * - Erro que não é de rede: tenta até MAX_ATTEMPTS e descarta, avisando a tela.
 */

const MAX_ATTEMPTS = 5;
const RETRY_INTERVAL_MS = 20_000;

export interface OutboxStatus {
  pending: number;
  syncing: boolean;
  /** Última operação descartada por erro (para avisar o usuário). */
  lastFailure: string | null;
}

let status: OutboxStatus = { pending: 0, syncing: false, lastFailure: null };
const listeners = new Set<() => void>();
const closedListeners = new Set<(sessionId: string) => void>();
let flushing: Promise<void> | null = null;
let started = false;

function setStatus(next: Partial<OutboxStatus>) {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
}

async function refreshPending() {
  setStatus({ pending: await offlineDb().outbox.count() });
}

async function execute(op: OutboxOp): Promise<{ error: ApiError | null }> {
  const client = getSupabaseClient();
  switch (op.kind) {
    case "saveSet":
      return saveSet(client, { sessionExerciseId: op.sessionExerciseId, set: op.set });
    case "deleteSet":
      return deleteSet(client, { setId: op.setId });
    case "addExercises":
      return addWorkoutExercises(client, { sessionId: op.sessionId, exercises: op.exercises });
    case "replaceExercise":
      return replaceWorkoutExercise(client, op);
    case "removeExercise":
      return removeWorkoutExercise(client, { sessionExerciseId: op.sessionExerciseId });
    case "exerciseNote":
      return saveExerciseNote(client, { sessionExerciseId: op.sessionExerciseId, note: op.note });
    case "workoutNote":
      return saveWorkoutNote(client, { sessionId: op.sessionId, note: op.note });
    case "pause":
      return pauseWorkout(client, { sessionId: op.sessionId, at: op.at });
    case "resume":
      return resumeWorkout(client, { sessionId: op.sessionId, at: op.at });
    case "createExercise":
      return createExercise(client, op);
    case "finish": {
      const res = await finishWorkout(client, { sessionId: op.sessionId });
      // Já finalizado (ex.: em outro aparelho) conta como feito.
      return { error: res.error?.code === "workout_not_found" ? null : res.error };
    }
    case "discard":
      return discardWorkout(client, { sessionId: op.sessionId });
  }
}

async function runFlush() {
  const db = offlineDb();
  setStatus({ syncing: true });
  try {
    for (;;) {
      const entry = await db.outbox.orderBy("seq").first();
      if (!entry?.seq) break;
      const { error } = await execute(entry.op);
      if (!error) {
        await db.outbox.delete(entry.seq);
        // Treino finalizado/descartado no servidor: o retrato local não serve mais.
        if ((entry.op.kind === "finish" || entry.op.kind === "discard") && entry.sessionId) {
          await db.workouts.delete(entry.sessionId);
          const closedId = entry.sessionId;
          closedListeners.forEach((l) => l(closedId));
        }
        continue;
      }
      if (isNetworkError(error) || error.code === "not_authenticated") break; // tenta depois
      const attempts = entry.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await db.outbox.delete(entry.seq);
        setStatus({ lastFailure: error.message });
      } else {
        await db.outbox.update(entry.seq, { attempts, lastError: error.message });
        break;
      }
    }
  } finally {
    await refreshPending();
    setStatus({ syncing: false });
  }
}

/** Envia a fila agora (uma execução por vez). */
export function flushOutbox(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  flushing ??= runFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

/** Coloca uma gravação na fila e tenta enviar em seguida. */
export async function enqueue(op: OutboxOp): Promise<void> {
  const sessionId = "sessionId" in op ? op.sessionId : null;
  const entry: OutboxEntry = { sessionId, op, createdAt: Date.now(), attempts: 0 };
  // Descartar o treino: as gravações pendentes dele deixam de fazer sentido.
  if (op.kind === "discard") await offlineDb().outbox.where("sessionId").equals(op.sessionId).delete();
  await offlineDb().outbox.add(entry);
  await refreshPending();
  void flushOutbox();
}

/** Há gravações pendentes deste treino? */
export async function hasPendingFor(sessionId: string): Promise<boolean> {
  return (await offlineDb().outbox.where("sessionId").equals(sessionId).count()) > 0;
}

/** O treino foi finalizado/descartado no aparelho e ainda não chegou ao servidor? */
export async function isClosedLocally(sessionId: string): Promise<boolean> {
  const entries = await offlineDb().outbox.where("sessionId").equals(sessionId).toArray();
  return entries.some((e) => e.op.kind === "finish" || e.op.kind === "discard");
}

/** Liga os gatilhos de reenvio (uma vez por aba). */
export function startOutboxSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => void flushOutbox());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void flushOutbox();
  });
  setInterval(() => {
    if (status.pending > 0 && navigator.onLine) void flushOutbox();
  }, RETRY_INTERVAL_MS);
  void refreshPending().then(() => flushOutbox());
}

/** Avisa quando um treino finalizado/descartado no aparelho chega ao servidor. Retorna o cancelamento. */
export function onWorkoutClosedSynced(listener: (sessionId: string) => void): () => void {
  closedListeners.add(listener);
  return () => closedListeners.delete(listener);
}

/** Situação da fila (pendências, enviando, última falha). */
export function useOutboxStatus(): OutboxStatus {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => status,
    () => status,
  );
}

/** Limpa o aviso de falha depois de exibido. */
export function dismissOutboxFailure() {
  setStatus({ lastFailure: null });
}
