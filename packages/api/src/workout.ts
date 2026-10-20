import type { ActivePeriod, SetType, WeightUnit } from "@guf/core";
import type { Database } from "@guf/types";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";

/**
 * Treino em andamento e biblioteca de exercícios (Supabase).
 *
 * Todas as gravações usam ids gerados NO APARELHO e são idempotentes (upsert / apagar o
 * que não existe não falha): a fila offline do app pode reenviar a mesma operação sem duplicar.
 * apps/web/src/mocks/workout.ts implementa o mesmo contrato (`satisfies WorkoutApi`) para
 * os estados de desenvolvimento (?estado=).
 */

/* =====================================================================
 * Contrato
 * ===================================================================== */

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

/** Desempenho de uma série no último treino (coluna "Anterior"). Peso em kg. */
export interface PreviousSet {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  setType: SetType;
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
  /** Observação do exercício (do treino ou, se vazia, a salva na rotina). */
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
  /** Períodos em que o treino estava rodando (workout_active_periods). */
  activePeriods: ActivePeriod[];
  note: string | null;
  /** Unidade de exibição do usuário (o banco guarda kg). */
  weightUnit: WeightUnit;
  exercises: WorkoutExercise[];
}

export interface PersonalRecord {
  exerciseName: string;
  weightKg: number;
  reps: number;
}

/** Resumo devolvido ao finalizar (finish_workout). */
export interface FinishedWorkoutSummary {
  /** Tempo EFETIVO (sem pausas). */
  durationSeconds: number;
  /** Início → fim real. */
  elapsedSeconds: number;
  pauseCount: number;
  volumeKg: number;
  setCount: number;
  personalRecords: PersonalRecord[];
}

/** Contexto para montar um exercício novo no treino (online). */
export interface ExerciseContext {
  previous: PreviousSet[];
  bestKg: number | null;
  restSeconds: number;
  routineNote: string | null;
}

export interface SetInput {
  /** id gerado no aparelho (crypto.randomUUID()). */
  id: string;
  setNumber: number;
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  isCompleted: boolean;
}

/** Exercício a gravar no treino, com ids gerados no aparelho. */
export interface NewWorkoutExercise {
  id: string;
  exerciseId: string;
  position: number;
  sets: SetInput[];
}

export type GetWorkout = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<ActiveWorkout>>;
export type GetExerciseLibrary = (client: GufClient) => Promise<ApiResult<LibraryExercise[]>>;
export type GetExerciseContext = (
  client: GufClient,
  input: { exerciseIds: string[]; routineId: string | null },
) => Promise<ApiResult<Record<string, ExerciseContext>>>;
export type CreateExercise = (
  client: GufClient,
  input: { id: string; name: string; muscleGroup: string; equipment: string },
) => Promise<ApiResult<LibraryExercise>>;
export type AddWorkoutExercises = (
  client: GufClient,
  input: { sessionId: string; exercises: NewWorkoutExercise[] },
) => Promise<ApiResult<null>>;
/** Trocar exercício = apagar o session_exercise e criar outro (CLAUDE.md). */
export type ReplaceWorkoutExercise = (
  client: GufClient,
  input: { sessionId: string; sessionExerciseId: string; exercise: NewWorkoutExercise },
) => Promise<ApiResult<null>>;
export type RemoveWorkoutExercise = (client: GufClient, input: { sessionExerciseId: string }) => Promise<ApiResult<null>>;
/** Nova ordem dos exercícios do treino (ids na ordem da tela; position = índice). Reenviar não muda nada. */
export type ReorderWorkoutExercises = (client: GufClient, input: { sessionExerciseIds: string[] }) => Promise<ApiResult<null>>;
/** Cria ou atualiza uma série (upsert pelo id gerado no aparelho). */
export type SaveSet = (client: GufClient, input: { sessionExerciseId: string; set: SetInput }) => Promise<ApiResult<null>>;
export type DeleteSet = (client: GufClient, input: { setId: string }) => Promise<ApiResult<null>>;
export type SaveExerciseNote = (client: GufClient, input: { sessionExerciseId: string; note: string }) => Promise<ApiResult<null>>;
export type SaveWorkoutNote = (client: GufClient, input: { sessionId: string; note: string }) => Promise<ApiResult<null>>;
/** Pausar/retomar com o horário real (fila offline). Repetir não muda nada. */
export type PauseWorkout = (client: GufClient, input: { sessionId: string; at: string }) => Promise<ApiResult<null>>;
export type ResumeWorkout = (client: GufClient, input: { sessionId: string; at: string }) => Promise<ApiResult<null>>;
export type FinishWorkout = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<FinishedWorkoutSummary>>;
/** Descartar = apagar a sessão (séries e períodos saem em cascata). */
export type DiscardWorkout = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<null>>;

/** Situação do treino no servidor: em andamento, concluído (pelo usuário ou automaticamente) ou inexistente. */
export type WorkoutStatus = "in_progress" | "completed" | "missing";
/** Consulta leve para o app saber se o treino ativo foi encerrado fora dele (ex.: finalização automática). */
export type GetWorkoutStatus = (
  client: GufClient,
  input: { sessionId: string },
) => Promise<ApiResult<{ status: WorkoutStatus; /** Encerrado pela finalização automática (30 min após a última série). */ autoFinished: boolean }>>;

/**
 * Faz os exercícios e as séries do treino finalizado virarem os da rotina dele (RPC
 * update_routine_from_workout). Só depois de finalizar; erros: routine_not_found, routine_empty.
 */
export type UpdateRoutineFromWorkout = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<null>>;

export interface WorkoutApi {
  getWorkout: GetWorkout;
  getExerciseLibrary: GetExerciseLibrary;
  getExerciseContext: GetExerciseContext;
  createExercise: CreateExercise;
  addWorkoutExercises: AddWorkoutExercises;
  replaceWorkoutExercise: ReplaceWorkoutExercise;
  removeWorkoutExercise: RemoveWorkoutExercise;
  reorderWorkoutExercises: ReorderWorkoutExercises;
  saveSet: SaveSet;
  deleteSet: DeleteSet;
  saveExerciseNote: SaveExerciseNote;
  saveWorkoutNote: SaveWorkoutNote;
  pauseWorkout: PauseWorkout;
  resumeWorkout: ResumeWorkout;
  finishWorkout: FinishWorkout;
  updateRoutineFromWorkout: UpdateRoutineFromWorkout;
  discardWorkout: DiscardWorkout;
  getWorkoutStatus: GetWorkoutStatus;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

type SetLogInsert = Database["public"]["Tables"]["set_logs"]["Insert"];
type SessionExerciseInsert = Database["public"]["Tables"]["session_exercises"]["Insert"];

export const DEFAULT_REST_SECONDS = 90;
const FREE_WORKOUT_NAME = "Treino livre";

const asSetType = (value: string): SetType =>
  value === "warmup" || value === "dropset" || value === "failure" ? value : "normal";

/** set_logs a gravar: user_id, session_id, exercise_id e completed_at vêm por gatilho (CLAUDE.md). */
function setRow(sessionExerciseId: string, set: SetInput): SetLogInsert {
  return {
    id: set.id,
    session_exercise_id: sessionExerciseId,
    set_number: set.setNumber,
    set_type: set.setType,
    weight_kg: set.weightKg,
    reps: set.reps,
    is_completed: set.isCompleted,
  } as SetLogInsert;
}

/** session_exercises a gravar: user_id vem por gatilho (CLAUDE.md). */
function sessionExerciseRow(sessionId: string, exercise: NewWorkoutExercise): SessionExerciseInsert {
  return { id: exercise.id, session_id: sessionId, exercise_id: exercise.exerciseId, position: exercise.position } as SessionExerciseInsert;
}

/** Melhor carga histórica (get_exercise_records → max_weight); sem histórico = null (sem PR). */
async function bestLoadKg(client: GufClient, exerciseId: string): Promise<number | null> {
  const { data, error } = await client.rpc("get_exercise_records", { p_exercise_id: exerciseId });
  if (error || !data || typeof data !== "object") return null;
  const records = data as { sessions?: number; max_weight?: { value?: number | null } | null };
  if (!records.sessions) return null;
  const value = records.max_weight?.value;
  return typeof value === "number" ? value : value != null ? Number(value) : null;
}

export const getExerciseContext: GetExerciseContext = async (client, { exerciseIds, routineId }) => {
  try {
    const ids = [...new Set(exerciseIds)];
    if (ids.length === 0) return { data: {}, error: null };
    const [lastRes, routineRes, bests] = await Promise.all([
      client.rpc("get_last_performance", { p_exercise_ids: ids }),
      routineId
        ? client.from("routine_exercises").select("exercise_id, rest_seconds, notes").eq("routine_id", routineId)
        : Promise.resolve({ data: [] as { exercise_id: string; rest_seconds: number | null; notes: string | null }[], error: null }),
      Promise.all(ids.map((id) => bestLoadKg(client, id))),
    ]);
    if (lastRes.error) return { data: null, error: toApiError(lastRes.error) };
    if (routineRes.error) return { data: null, error: toApiError(routineRes.error) };

    const context: Record<string, ExerciseContext> = {};
    ids.forEach((id, i) => {
      const planned = routineRes.data?.find((r) => r.exercise_id === id);
      context[id] = {
        previous: (lastRes.data ?? [])
          .filter((p) => p.exercise_id === id)
          .map((p) => ({ setNumber: p.set_number, weightKg: p.weight_kg, reps: p.reps, setType: asSetType(p.set_type) })),
        bestKg: bests[i] ?? null,
        restSeconds: planned?.rest_seconds ?? DEFAULT_REST_SECONDS,
        routineNote: planned?.notes ?? null,
      };
    });
    return { data: context, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getWorkout: GetWorkout = async (client, { sessionId }) => {
  try {
    const [sessionRes, profileRes] = await Promise.all([
      client
        .from("workout_sessions")
        .select(
          "id, name, status, routine_id, performed_on, started_at, notes, routines(projects(name)), workout_active_periods(started_at, ended_at), session_exercises(id, exercise_id, position, notes, exercises(name, muscle_group, equipment), set_logs(id, set_number, set_type, weight_kg, reps, is_completed))",
        )
        .eq("id", sessionId)
        .order("position", { referencedTable: "session_exercises", ascending: true })
        .order("set_number", { referencedTable: "session_exercises.set_logs", ascending: true })
        .order("started_at", { referencedTable: "workout_active_periods", ascending: true })
        .maybeSingle(),
      client.from("profiles").select("weight_unit").maybeSingle(),
    ]);
    if (sessionRes.error) return { data: null, error: toApiError(sessionRes.error) };
    const s = sessionRes.data;
    if (!s || s.status !== "in_progress") return { data: null, error: apiError("workout_not_found") };

    const contextRes = await getExerciseContext(client, {
      exerciseIds: s.session_exercises.map((e) => e.exercise_id),
      routineId: s.routine_id,
    });
    if (contextRes.error) return { data: null, error: contextRes.error };
    const context = contextRes.data;

    const workout: ActiveWorkout = {
      id: s.id,
      name: s.name ?? FREE_WORKOUT_NAME,
      routineId: s.routine_id,
      projectName: s.routines?.projects?.name ?? null,
      performedOn: s.performed_on,
      startedAt: s.started_at,
      activePeriods: s.workout_active_periods.map((p) => ({ startedAt: p.started_at, endedAt: p.ended_at })),
      note: s.notes,
      weightUnit: profileRes.data?.weight_unit === "lb" ? "lb" : "kg",
      exercises: s.session_exercises.map((se) => {
        const ctx = context[se.exercise_id];
        return {
          id: se.id,
          exerciseId: se.exercise_id,
          name: se.exercises?.name ?? "Exercício",
          muscleGroup: se.exercises?.muscle_group ?? "",
          equipment: se.exercises?.equipment ?? "outro",
          restSeconds: ctx?.restSeconds ?? DEFAULT_REST_SECONDS,
          note: se.notes ?? ctx?.routineNote ?? null,
          bestKg: ctx?.bestKg ?? null,
          sets: se.set_logs.map((l) => {
            const prev = ctx?.previous.find((p) => p.setNumber === l.set_number);
            return {
              id: l.id,
              setNumber: l.set_number,
              setType: asSetType(l.set_type),
              weightKg: l.weight_kg,
              reps: l.reps,
              isCompleted: l.is_completed,
              previous: prev ? { weightKg: prev.weightKg, reps: prev.reps } : null,
            };
          }),
        };
      }),
    };
    return { data: workout, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getExerciseLibrary: GetExerciseLibrary = async (client) => {
  try {
    // RLS: globais (user_id nulo) + os do próprio usuário.
    const { data, error } = await client
      .from("exercises")
      .select("id, name, muscle_group, equipment, user_id")
      .is("archived_at", null)
      .order("name", { ascending: true });
    if (error) return { data: null, error: toApiError(error) };
    return {
      data: data.map((e) => ({ id: e.id, name: e.name, muscleGroup: e.muscle_group, equipment: e.equipment, isCustom: e.user_id !== null })),
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const createExercise: CreateExercise = async (client, { id, name, muscleGroup, equipment }) => {
  try {
    const { data: session } = await client.auth.getSession();
    const userId = session.session?.user.id;
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { error } = await client
      .from("exercises")
      .upsert({ id, user_id: userId, name: name.trim(), muscle_group: muscleGroup, equipment }, { onConflict: "id", ignoreDuplicates: true });
    if (error) return { data: null, error: toApiError(error) };
    return { data: { id, name: name.trim(), muscleGroup, equipment, isCustom: true }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const addWorkoutExercises: AddWorkoutExercises = async (client, { sessionId, exercises }) => {
  try {
    if (exercises.length === 0) return { data: null, error: null };
    const se = await client
      .from("session_exercises")
      .upsert(exercises.map((e) => sessionExerciseRow(sessionId, e)), { onConflict: "id", ignoreDuplicates: true });
    if (se.error) return { data: null, error: toApiError(se.error) };
    const rows = exercises.flatMap((e) => e.sets.map((s) => setRow(e.id, s)));
    if (rows.length > 0) {
      const sets = await client.from("set_logs").upsert(rows, { onConflict: "id", ignoreDuplicates: true });
      if (sets.error) return { data: null, error: toApiError(sets.error) };
    }
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const replaceWorkoutExercise: ReplaceWorkoutExercise = async (client, { sessionId, sessionExerciseId, exercise }) => {
  try {
    const del = await client.from("session_exercises").delete().eq("id", sessionExerciseId);
    if (del.error) return { data: null, error: toApiError(del.error) };
    return addWorkoutExercises(client, { sessionId, exercises: [exercise] });
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const removeWorkoutExercise: RemoveWorkoutExercise = async (client, { sessionExerciseId }) => {
  try {
    const { error } = await client.from("session_exercises").delete().eq("id", sessionExerciseId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const reorderWorkoutExercises: ReorderWorkoutExercises = async (client, { sessionExerciseIds }) => {
  try {
    // Ids que não existem mais (exercício removido depois) simplesmente não atualizam nada.
    const results = await Promise.all(
      sessionExerciseIds.map((id, position) => client.from("session_exercises").update({ position }).eq("id", id)),
    );
    const failed = results.find((r) => r.error);
    return failed?.error ? { data: null, error: toApiError(failed.error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const saveSet: SaveSet = async (client, { sessionExerciseId, set }) => {
  try {
    const { error } = await client.from("set_logs").upsert(setRow(sessionExerciseId, set), { onConflict: "id" });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const deleteSet: DeleteSet = async (client, { setId }) => {
  try {
    const { error } = await client.from("set_logs").delete().eq("id", setId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/** Observação do exercício: no treino e, se veio de rotina, também na rotina (vale para os próximos). */
export const saveExerciseNote: SaveExerciseNote = async (client, { sessionExerciseId, note }) => {
  try {
    const value = note.trim() || null;
    const seRes = await client
      .from("session_exercises")
      .update({ notes: value })
      .eq("id", sessionExerciseId)
      .select("exercise_id, workout_sessions(routine_id)")
      .maybeSingle();
    if (seRes.error) return { data: null, error: toApiError(seRes.error) };
    const routineId = seRes.data?.workout_sessions?.routine_id;
    if (routineId && seRes.data) {
      const re = await client
        .from("routine_exercises")
        .update({ notes: value })
        .eq("routine_id", routineId)
        .eq("exercise_id", seRes.data.exercise_id);
      if (re.error) return { data: null, error: toApiError(re.error) };
    }
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const saveWorkoutNote: SaveWorkoutNote = async (client, { sessionId, note }) => {
  try {
    const { error } = await client.from("workout_sessions").update({ notes: note.trim() || null }).eq("id", sessionId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const pauseWorkout: PauseWorkout = async (client, { sessionId, at }) => {
  try {
    const { error } = await client.rpc("pause_workout", { p_session_id: sessionId, p_at: at });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const resumeWorkout: ResumeWorkout = async (client, { sessionId, at }) => {
  try {
    const { error } = await client.rpc("resume_workout", { p_session_id: sessionId, p_at: at });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

interface FinishJson {
  duration_seconds?: number | null;
  elapsed_seconds?: number | null;
  pauses?: number | null;
  sets?: number | null;
  total_volume_kg?: number | string | null;
  personal_records?: Array<{ name: string; pr_type: string; value: number | string; reps: number | null }>;
}

export const finishWorkout: FinishWorkout = async (client, { sessionId }) => {
  try {
    const { data, error } = await client.rpc("finish_workout", { p_session_id: sessionId });
    if (error) return { data: null, error: toApiError(error) };
    const json = (data ?? {}) as FinishJson;
    return {
      data: {
        durationSeconds: json.duration_seconds ?? 0,
        elapsedSeconds: json.elapsed_seconds ?? json.duration_seconds ?? 0,
        pauseCount: json.pauses ?? 0,
        volumeKg: Number(json.total_volume_kg ?? 0),
        setCount: json.sets ?? 0,
        // A tela mostra recordes de carga ("Maior carga · …").
        personalRecords: (json.personal_records ?? [])
          .filter((p) => p.pr_type === "max_weight")
          .map((p) => ({ exerciseName: p.name, weightKg: Number(p.value), reps: p.reps ?? 0 })),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const discardWorkout: DiscardWorkout = async (client, { sessionId }) => {
  try {
    const { error } = await client.from("workout_sessions").delete().eq("id", sessionId);
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getWorkoutStatus: GetWorkoutStatus = async (client, { sessionId }) => {
  try {
    const { data, error } = await client.from("workout_sessions").select("status, auto_finished").eq("id", sessionId).maybeSingle();
    if (error) return { data: null, error: toApiError(error) };
    const status: WorkoutStatus = !data ? "missing" : data.status === "in_progress" ? "in_progress" : "completed";
    return { data: { status, autoFinished: data?.auto_finished ?? false }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/** Garante em tempo de compilação que a implementação segue o contrato. */
export const updateRoutineFromWorkout: UpdateRoutineFromWorkout = async (client, { sessionId }) => {
  try {
    const { error } = await client.rpc("update_routine_from_workout", { p_session_id: sessionId });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const workoutApi = {
  getWorkoutStatus,
  getWorkout,
  getExerciseLibrary,
  getExerciseContext,
  createExercise,
  addWorkoutExercises,
  replaceWorkoutExercise,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  saveSet,
  deleteSet,
  saveExerciseNote,
  saveWorkoutNote,
  pauseWorkout,
  resumeWorkout,
  finishWorkout,
  updateRoutineFromWorkout,
  discardWorkout,
} satisfies WorkoutApi;
