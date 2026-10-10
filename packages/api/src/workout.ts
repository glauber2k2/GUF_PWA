import type { SetType } from "@guf/core";
import type { GufClient } from "./client";
import type { ApiResult } from "./home";

/**
 * CONTRATO do treino em andamento e da biblioteca de exercícios.
 *
 * A implementação real (Supabase + offline com Dexie) entra numa próxima etapa neste pacote,
 * com estes mesmos nomes e assinaturas. Até lá, apps/web/src/mocks/workout.ts implementa o
 * contrato (`satisfies WorkoutApi`) — integrar será só trocar a importação.
 *
 * Fontes previstas: workout_sessions, session_exercises, set_logs, exercises,
 * get_last_performance (coluna "anterior"), get_exercise_records (melhor carga),
 * finish_workout (resumo + personal_records). Pausa: migration futura com
 * workout_sessions.paused_at e paused_seconds (até lá, guardada no aparelho).
 */

/** Exercício da biblioteca (globais + personalizados do usuário). */
export interface LibraryExercise {
  id: string;
  name: string;
  /** Código de exercises.muscle_group. */
  muscleGroup: string;
  /** Código de exercises.equipment. */
  equipment: string;
  isCustom: boolean;
}

/** Série registrada no treino (set_logs). Peso sempre em kg. */
export interface WorkoutSet {
  id: string;
  setNumber: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  isCompleted: boolean;
  /** Desempenho na mesma posição do último treino (coluna "Anterior"). */
  previous: { weightKg: number | null; reps: number | null } | null;
}

/** Exercício do treino (session_exercises + dados do exercício). */
export interface WorkoutExercise {
  /** id de session_exercises. */
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  /** Descanso planejado na rotina (padrão 90s). */
  restSeconds: number;
  /** Observação do exercício (fica para os próximos treinos). */
  note: string | null;
  /** Maior carga já registrada antes deste treino; null = primeira vez (sem PR). */
  bestKg: number | null;
  sets: WorkoutSet[];
}

export interface ActiveWorkout {
  id: string;
  /** Nome exibido: rotina ou "Treino livre". */
  name: string;
  routineId: string | null;
  projectName: string | null;
  performedOn: string;
  startedAt: string;
  pausedAt: string | null;
  pausedSeconds: number;
  note: string | null;
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

/** Resumo devolvido ao finalizar (finish_workout). */
export interface FinishedWorkoutSummary {
  durationSeconds: number;
  volumeKg: number;
  setCount: number;
  personalRecords: PersonalRecord[];
}

export interface SetInput {
  setNumber: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  isCompleted: boolean;
}

export type GetWorkout = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<ActiveWorkout>>;
export type GetExerciseLibrary = (client: GufClient) => Promise<ApiResult<LibraryExercise[]>>;
export type CreateExercise = (
  client: GufClient,
  input: { name: string; muscleGroup: string; equipment: string },
) => Promise<ApiResult<LibraryExercise>>;
export type AddWorkoutExercises = (
  client: GufClient,
  input: { sessionId: string; exerciseIds: string[] },
) => Promise<ApiResult<WorkoutExercise[]>>;
/** Trocar exercício = apagar o session_exercise e criar outro (CLAUDE.md), mantendo o nº de séries. */
export type ReplaceWorkoutExercise = (
  client: GufClient,
  input: { sessionId: string; sessionExerciseId: string; exerciseId: string },
) => Promise<ApiResult<WorkoutExercise>>;
export type RemoveWorkoutExercise = (client: GufClient, input: { sessionExerciseId: string }) => Promise<ApiResult<null>>;
/** Cria (sem setId) ou atualiza uma série. */
export type SaveSet = (
  client: GufClient,
  input: { sessionExerciseId: string; setId?: string; set: SetInput },
) => Promise<ApiResult<WorkoutSet>>;
export type DeleteSet = (client: GufClient, input: { setId: string }) => Promise<ApiResult<null>>;
export type SaveExerciseNote = (client: GufClient, input: { sessionExerciseId: string; note: string }) => Promise<ApiResult<null>>;
export type SaveWorkoutNote = (client: GufClient, input: { sessionId: string; note: string }) => Promise<ApiResult<null>>;
export type SetWorkoutPaused = (
  client: GufClient,
  input: { sessionId: string; pausedAt: string | null; pausedSeconds: number },
) => Promise<ApiResult<null>>;
export type FinishWorkout = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<FinishedWorkoutSummary>>;
/** Descartar = apagar a sessão e as séries registradas. */
export type DiscardWorkout = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<null>>;

export interface WorkoutApi {
  getWorkout: GetWorkout;
  getExerciseLibrary: GetExerciseLibrary;
  createExercise: CreateExercise;
  addWorkoutExercises: AddWorkoutExercises;
  replaceWorkoutExercise: ReplaceWorkoutExercise;
  removeWorkoutExercise: RemoveWorkoutExercise;
  saveSet: SaveSet;
  deleteSet: DeleteSet;
  saveExerciseNote: SaveExerciseNote;
  saveWorkoutNote: SaveWorkoutNote;
  setWorkoutPaused: SetWorkoutPaused;
  finishWorkout: FinishWorkout;
  discardWorkout: DiscardWorkout;
}
