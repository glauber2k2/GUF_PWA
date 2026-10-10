import Dexie, { type Table } from "dexie";
import type { ActiveWorkout, LibraryExercise, NewWorkoutExercise, SetInput } from "@guf/api";

/*
 * Banco local (IndexedDB via Dexie) do treino em andamento — CLAUDE.md: offline do treino.
 * - workouts: retrato do treino com as alterações locais (abre sem internet);
 * - outbox: fila de gravações pendentes, enviadas em ordem quando a conexão volta;
 * - library: biblioteca de exercícios para o seletor funcionar sem internet;
 * - history: últimas respostas do Histórico (mostradas sem internet).
 * Tudo é apagado ao sair da conta (privacidade).
 */

export interface CachedWorkout {
  sessionId: string;
  workout: ActiveWorkout;
  updatedAt: number;
}

export type OutboxOp =
  | { kind: "saveSet"; sessionId: string; sessionExerciseId: string; set: SetInput }
  | { kind: "deleteSet"; sessionId: string; setId: string }
  | { kind: "addExercises"; sessionId: string; exercises: NewWorkoutExercise[] }
  | { kind: "replaceExercise"; sessionId: string; sessionExerciseId: string; exercise: NewWorkoutExercise }
  | { kind: "removeExercise"; sessionId: string; sessionExerciseId: string }
  | { kind: "exerciseNote"; sessionId: string; sessionExerciseId: string; note: string }
  | { kind: "workoutNote"; sessionId: string; note: string }
  | { kind: "pause"; sessionId: string; at: string }
  | { kind: "resume"; sessionId: string; at: string }
  | { kind: "createExercise"; id: string; name: string; muscleGroup: string; equipment: string }
  | { kind: "finish"; sessionId: string }
  | { kind: "discard"; sessionId: string };

export interface OutboxEntry {
  seq?: number;
  /** Treino a que a operação pertence (null = biblioteca). */
  sessionId: string | null;
  op: OutboxOp;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface CachedLibrary {
  key: "all";
  items: LibraryExercise[];
  updatedAt: number;
}

/** Resposta guardada de uma consulta (chave = consulta + parâmetros). */
export interface CachedQuery {
  key: string;
  value: unknown;
  updatedAt: number;
}

class GufOfflineDB extends Dexie {
  workouts!: Table<CachedWorkout, string>;
  outbox!: Table<OutboxEntry, number>;
  library!: Table<CachedLibrary, string>;
  history!: Table<CachedQuery, string>;

  constructor() {
    super("guf-offline");
    this.version(1).stores({
      workouts: "sessionId",
      outbox: "++seq, sessionId",
      library: "key",
    });
    this.version(2).stores({ history: "key" });
  }
}

let instance: GufOfflineDB | null = null;

/** Banco local (criado sob demanda, só no navegador). */
export function offlineDb(): GufOfflineDB {
  instance ??= new GufOfflineDB();
  return instance;
}

/** Apaga todos os dados locais (ao sair da conta). */
export async function clearOfflineData(): Promise<void> {
  const db = offlineDb();
  await Promise.all([db.workouts.clear(), db.outbox.clear(), db.library.clear(), db.history.clear()]);
}
