import {
  buildCardioRecord,
  cardioActivityFor,
  previousCardioBest,
  recordSetIndex,
  sessionRecord1Rm,
  sessionTotals,
  setMetricKind,
  type CardioBest,
  type ExerciseSessionBest,
  type LoggedSet,
  type RecordValue,
  type SetValues,
  type WeightUnit,
} from "@guf/core";
import { fetchCardioHistories } from "./cardio-history";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import {
  currentUserId,
  fetchTrainingTotals,
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
/** Recorde de um treino do dia: a série de carga que bateu o 1RM ou a marca de cardio. */
export type DayRecord = { exerciseName: string } & RecordValue;

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
      // 1º treino do histórico inteiro: o calendário mostra até onde dá para voltar (o plano barra depois).
      fetchTrainingTotals(client),
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
        firstTrainedOn: firstRes.data?.firstTrainedOn ?? null,
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
  muscleGroup: string;
  sets: (LoggedSet & Pick<SetValues, "distanceKm" | "durationSeconds">)[];
}

/** Série do recorde de carga: a primeira com o 1RM do recorde (como no resumo). */
function loadRecordValue(sets: DayExercise["sets"], record1RmKg: number | null): RecordValue | null {
  const set = sets[recordSetIndex(sets, record1RmKg) ?? -1];
  return set ? { metric: "load", weightKg: set.weightKg ?? 0, reps: set.reps } : null;
}

/** Recorde de cardio do exercício no treino (ritmo/velocidade ou distância). */
function cardioRecordValue(exercise: DayExercise, previous: CardioBest | null): RecordValue | null {
  const built = buildCardioRecord(exercise.sets, previous, cardioActivityFor(exercise.name).rate);
  return built && { metric: "cardio", cardio: built.record };
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
        (results[i]?.data ?? []).map((h) => ({
          sessionId: h.session_id,
          performedOn: h.performed_on,
          maxWeightKg: Number(h.max_weight_kg),
          best1RmKg: h.best_e1rm_kg === null ? null : Number(h.best_e1rm_kg),
        })),
      ]),
    ),
    error: null,
  };
}

/**
 * Treinos concluídos de um dia, com volume/séries (regras do core) e os recordes (pelo 1RM estimado)
 * batidos em cada um — mesma regra do finish_workout, comparando com os treinos anteriores.
 */
export const getDaySessions: GetDaySessions = async (client, { performedOn }) => {
  try {
    const { data, error } = await client
      .from("workout_sessions")
      .select(
        "id, name, routine_id, started_at, finished_at, active_seconds, session_exercises(exercise_id, exercises(name, muscle_group), set_logs(set_type, weight_kg, reps, distance_km, duration_seconds, is_completed))",
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
        muscleGroup: se.exercises?.muscle_group ?? "",
        sets: toLoggedSets(se.set_logs).map((set, i) => ({
          ...set,
          distanceKm: se.set_logs[i]?.distance_km ?? null,
          durationSeconds: se.set_logs[i]?.duration_seconds ?? null,
        })),
      })),
    }));

    const exerciseIds = [...new Set(sessions.flatMap((s) => s.exercises.map((e) => e.exerciseId)))];
    const [histories, cardioHistories] = await Promise.all([exerciseHistories(client, exerciseIds), fetchCardioHistories(client, exerciseIds)]);
    if (histories.error) return { data: null, error: histories.error };
    if (cardioHistories.error) return { data: null, error: cardioHistories.error };

    return {
      data: sessions.map(({ row, exercises }, index) => {
        // Treinos do mesmo dia que terminaram antes deste (a lista está em ordem de término).
        const earlierSameDay = new Set(sessions.slice(0, index).map((s) => s.row.id));
        const records = exercises.flatMap<DayRecord>((e) => {
          const record =
            setMetricKind(e.muscleGroup) === "cardio"
              ? cardioRecordValue(e, previousCardioBest(cardioHistories.data.get(e.exerciseId) ?? [], row.id, performedOn, earlierSameDay))
              : loadRecordValue(e.sets, sessionRecord1Rm(histories.data.get(e.exerciseId) ?? [], row.id, performedOn, earlierSameDay));
          return record ? [{ exerciseName: e.name, ...record }] : [];
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
