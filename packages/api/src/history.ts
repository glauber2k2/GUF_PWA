import { sessionLoadRecord, sessionTotals, type ExerciseSessionBest, type LoggedSet, type WeightUnit } from "@guf/core";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import {
  currentUserId,
  FREE_WORKOUT_NAME,
  sessionDurationSeconds,
  toLoggedSets,
  toStreakSummary,
  toTrainingDay,
  type StreakSummary,
  type TrainingDay,
} from "./shared";

/* =====================================================================
 * Contrato
 * ===================================================================== */

export interface DateRangeInput {
  /** Datas locais "yyyy-MM-dd" (inclusive). */
  from: string;
  to: string;
}

/** Dados gerais do Histórico: sequência, faixa de semanas, gráfico e limites do calendário. */
export interface HistoryOverview {
  /** Dias treinados no intervalo pedido (get_training_days). */
  trainingDays: TrainingDay[];
  /** Sequência de semanas: SEMPRE do get_streak() (nunca recalculada no app). */
  streak: StreakSummary;
  /** Meta semanal (só exibição). */
  weeklyGoal: number | null;
  weightUnit: WeightUnit;
  /** Data do primeiro treino concluído (limite do calendário); null = nenhum treino. */
  firstTrainedOn: string | null;
}

/** Recorde de carga batido num treino. */
export interface DayRecord {
  exerciseName: string;
  weightKg: number;
  reps: number | null;
}

/** Treino concluído de um dia (folha do calendário). */
export interface DaySession {
  id: string;
  name: string;
  /** Rotina de origem; null = treino livre. */
  routineId: string | null;
  durationSeconds: number;
  volumeKg: number;
  setCount: number;
  records: DayRecord[];
}

export type GetHistoryOverview = (client: GufClient, input: DateRangeInput) => Promise<ApiResult<HistoryOverview>>;
export type GetTrainingDays = (client: GufClient, input: DateRangeInput) => Promise<ApiResult<TrainingDay[]>>;
export type GetDaySessions = (client: GufClient, input: { performedOn: string }) => Promise<ApiResult<DaySession[]>>;

export interface HistoryApi {
  getHistoryOverview: GetHistoryOverview;
  getTrainingDays: GetTrainingDays;
  getDaySessions: GetDaySessions;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

export const getTrainingDays: GetTrainingDays = async (client, { from, to }) => {
  try {
    const { data, error } = await client.rpc("get_training_days", { p_from: from, p_to: to });
    if (error) return { data: null, error: toApiError(error) };
    return { data: data.map(toTrainingDay), error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getHistoryOverview: GetHistoryOverview = async (client, range) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };

    const [days, streakRes, profileRes, firstRes] = await Promise.all([
      getTrainingDays(client, range),
      client.rpc("get_streak"),
      client.from("profiles").select("weekly_goal, weight_unit").eq("id", userId).maybeSingle(),
      client
        .from("workout_sessions")
        .select("performed_on")
        .eq("status", "completed")
        .order("performed_on", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    if (days.error) return { data: null, error: days.error };
    const firstError = [streakRes, profileRes, firstRes].find((r) => r.error)?.error;
    if (firstError) return { data: null, error: toApiError(firstError) };

    return {
      data: {
        trainingDays: days.data,
        streak: toStreakSummary(streakRes.data?.[0]),
        weeklyGoal: profileRes.data?.weekly_goal ?? null,
        weightUnit: profileRes.data?.weight_unit === "lb" ? "lb" : "kg",
        firstTrainedOn: firstRes.data?.performed_on ?? null,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

interface DayExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
}

/** Maior repetição feita com a carga do recorde (como no finish_workout). */
function repsAtLoad(sets: readonly LoggedSet[], weightKg: number): number | null {
  const reps = sets
    .filter((s) => s.isCompleted && s.setType !== "warmup" && s.weightKg === weightKg && s.reps !== null)
    .map((s) => s.reps as number);
  return reps.length ? Math.max(...reps) : null;
}

/** Histórico por treino de cada exercício (get_exercise_history), para achar os recordes do dia. */
export async function exerciseHistories(client: GufClient, exerciseIds: readonly string[]): Promise<ApiResult<Map<string, ExerciseSessionBest[]>>> {
  const results = await Promise.all(exerciseIds.map((id) => client.rpc("get_exercise_history", { p_exercise_id: id })));
  const failed = results.find((r) => r.error);
  if (failed?.error) return { data: null, error: toApiError(failed.error) };
  return {
    data: new Map(
      exerciseIds.map((id, i) => [
        id,
        (results[i]?.data ?? []).map((h) => ({ sessionId: h.session_id, performedOn: h.performed_on, maxWeightKg: Number(h.max_weight_kg) })),
      ]),
    ),
    error: null,
  };
}

/**
 * Treinos concluídos de um dia, com volume/séries (regras do core) e os recordes de carga
 * batidos em cada um — mesma regra do finish_workout, comparando com os treinos anteriores.
 */
export const getDaySessions: GetDaySessions = async (client, { performedOn }) => {
  try {
    const { data, error } = await client
      .from("workout_sessions")
      .select(
        "id, name, routine_id, started_at, finished_at, active_seconds, session_exercises(exercise_id, exercises(name), set_logs(set_type, weight_kg, reps, is_completed))",
      )
      .eq("status", "completed")
      .eq("performed_on", performedOn)
      .order("finished_at", { ascending: true });
    if (error) return { data: null, error: toApiError(error) };

    const sessions = data.map((s) => ({
      row: s,
      exercises: s.session_exercises.map<DayExercise>((se) => ({
        exerciseId: se.exercise_id,
        name: se.exercises?.name ?? "Exercício",
        sets: toLoggedSets(se.set_logs),
      })),
    }));

    const exerciseIds = [...new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId)))];
    const histories = await exerciseHistories(client, exerciseIds);
    if (histories.error) return { data: null, error: histories.error };

    return {
      data: sessions.map(({ row, exercises }, index) => {
        // Treinos do mesmo dia que terminaram antes deste (a lista está em ordem de término).
        const earlierSameDay = new Set(sessions.slice(0, index).map((s) => s.row.id));
        const records = exercises.flatMap<DayRecord>((e) => {
          const load = sessionLoadRecord(histories.data.get(e.exerciseId) ?? [], row.id, performedOn, earlierSameDay);
          return load === null ? [] : [{ exerciseName: e.name, weightKg: load, reps: repsAtLoad(e.sets, load) }];
        });
        const totals = sessionTotals(exercises.flatMap((e) => e.sets));
        return {
          id: row.id,
          name: row.name ?? FREE_WORKOUT_NAME,
          routineId: row.routine_id,
          durationSeconds: sessionDurationSeconds(row),
          volumeKg: totals.volumeKg,
          setCount: totals.setCount,
          records,
        };
      }),
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const historyApi = { getHistoryOverview, getTrainingDays, getDaySessions } satisfies HistoryApi;
