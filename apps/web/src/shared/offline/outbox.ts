import { useSyncExternalStore } from "react";
import {
  addWorkoutExercises,
  createExercise,
  deleteSet,
  discardWorkout,
  finishWorkout,
  getWorkoutStatus,
  updateRoutineFromWorkout,
  isNetworkError,
  pauseWorkout,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  replaceWorkoutExercise,
  resumeWorkout,
  saveExerciseNote,
  saveSet,
  saveWorkoutNote,
  type ApiError,
} from "@guf/api";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { offlineDb, type OutboxEntry, type OutboxOp } from "./db";

/*
 * Fila de gravações do treino (offline-first).
 * - Toda alteração entra na fila e é aplicada na tela na hora.
 * - A fila é enviada EM ORDEM; erro de rede para o envio e tenta de novo depois
 *   (voltar a conexão, reabrir a aba ou a cada 20s enquanto houver pendências).
 * - As operações são idempotentes (ids gerados no aparelho), então reenviar não duplica.
 * - Erro que não é de rede: tenta até MAX_ATTEMPTS e descarta, avisando a tela.
 * - Antes de enviar a 1ª gravação de um treino em cada envio, confirma no servidor que ele ainda
 *   está em andamento. Encerrado (finalização automática ou outro aparelho): NADA dele é enviado
 *   (alterações feitas depois do encerramento não entram) e a tela é avisada.
 */

/** Treino encerrado no servidor cujas gravações pendentes foram descartadas no aparelho. */
export interface ServerClosedWorkout {
  sessionId: string;
  status: "completed" | "missing";
  /** Encerrado pela finalização automática (30 min após a última série). */
  autoFinished: boolean;
  /** Alterações descartadas (séries, exercícios, notas, pausas; sem contar finalizar/descartar). */
  droppedChanges: number;
}

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
const serverClosedListeners = new Set<(info: ServerClosedWorkout) => void>();
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
    case "reorderExercises":
      return reorderWorkoutExercises(client, { sessionExerciseIds: op.sessionExerciseIds });
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
      // Já finalizado (ex.: em outro aparelho ou numa tentativa anterior desta operação) conta como feito.
      if (res.error && res.error.code !== "workout_not_found") return { error: res.error };
      if (!op.updateRoutine) return { error: null };
      // Na mesma operação: se falhar, a nova tentativa finaliza de novo (já feito) e só atualiza a rotina.
      return updateRoutineFromWorkout(client, { sessionId: op.sessionId });
    }
    case "discard":
      return discardWorkout(client, { sessionId: op.sessionId });
  }
}

/**
 * O treino ainda está em andamento no servidor? Encerrado → descarta tudo dele no aparelho e avisa.
 * "retry" = sem internet/sessão (tenta depois).
 */
async function ensureOpen(sessionId: string): Promise<"open" | "closed" | "retry"> {
  const res = await getWorkoutStatus(getSupabaseClient(), { sessionId });
  if (res.error) return isNetworkError(res.error) || res.error.code === "not_authenticated" ? "retry" : "open";
  if (res.data.status === "in_progress") return "open";
  const droppedChanges = await dropWorkoutLocally(sessionId);
  const info: ServerClosedWorkout = { sessionId, status: res.data.status, autoFinished: res.data.autoFinished, droppedChanges };
  serverClosedListeners.forEach((l) => l(info));
  return "closed";
}

async function runFlush() {
  const db = offlineDb();
  setStatus({ syncing: true });
  // Treinos confirmados em andamento neste envio (uma consulta por treino).
  const verified = new Set<string>();
  try {
    for (;;) {
      const entry = await db.outbox.orderBy("seq").first();
      if (!entry?.seq) break;
      if (entry.sessionId && !verified.has(entry.sessionId)) {
        const state = await ensureOpen(entry.sessionId);
        if (state === "retry") break;
        if (state === "closed") continue;
        verified.add(entry.sessionId);
      }
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
      // Encerrado durante o envio (ex.: a finalização automática rodou agora): confere de novo.
      if (error.code === "workout_not_found" && entry.sessionId) {
        const state = await ensureOpen(entry.sessionId);
        if (state === "retry") break;
        if (state === "closed") continue;
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

/**
 * Remove do aparelho as gravações pendentes e o retrato de um treino que o servidor já encerrou.
 * Devolve quantas alterações foram descartadas (sem contar finalizar/descartar).
 */
export async function dropWorkoutLocally(sessionId: string): Promise<number> {
  const db = offlineDb();
  const pending = await db.outbox.where("sessionId").equals(sessionId).toArray();
  await db.outbox.where("sessionId").equals(sessionId).delete();
  await db.workouts.delete(sessionId);
  await refreshPending();
  return pending.filter((e) => e.op.kind !== "finish" && e.op.kind !== "discard").length;
}

/** Avisa quando a fila descarta um treino porque o servidor já o encerrou. Retorna o cancelamento. */
export function onWorkoutClosedOnServer(listener: (info: ServerClosedWorkout) => void): () => void {
  serverClosedListeners.add(listener);
  return () => serverClosedListeners.delete(listener);
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
