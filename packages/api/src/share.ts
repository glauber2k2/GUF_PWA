import { buildStoryData, storyContextRange, type SetType, type StoryData } from "@guf/core";
import type { GufClient } from "./client";
import { getWorkoutSummary } from "./evolution";
import { currentUserId, toStreakSummary, toTrainingDay } from "./shared";
import { apiError, toApiError, type ApiResult } from "./result";

/* =====================================================================
 * Contrato — Imagens de compartilhamento (stories)
 * Dados do treino concluído + contexto (sequência, semanas, mês) já formatados para os modelos.
 * ===================================================================== */

export type GetShareStoryData = (client: GufClient, input: { sessionId: string }) => Promise<ApiResult<StoryData>>;

export interface ShareApi {
  getShareStoryData: GetShareStoryData;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

interface MonthSetRow {
  exercises: { muscle_group: string } | null;
  workout_sessions: { performed_on: string } | null;
  set_logs: Array<{ set_type: string; is_completed: boolean }>;
}

export const getShareStoryData: GetShareStoryData = async (client, { sessionId }) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const summary = await getWorkoutSummary(client, { sessionId });
    if (summary.error) return { data: null, error: summary.error };
    const s = summary.data;
    const range = storyContextRange(s.performedOn);

    const [streakRes, profileRes, daysRes, setsRes] = await Promise.all([
      client.rpc("get_streak"),
      client.from("profiles").select("weekly_goal").eq("id", userId).maybeSingle(),
      client.rpc("get_training_days", { p_from: range.from, p_to: range.to }),
      // Séries concluídas por exercício nos treinos concluídos do período (grupos do mês).
      client
        .from("session_exercises")
        .select("exercises(muscle_group), workout_sessions!inner(performed_on, status), set_logs(set_type, is_completed)")
        .eq("workout_sessions.status", "completed")
        .gte("workout_sessions.performed_on", range.from)
        .lte("workout_sessions.performed_on", range.to),
    ]);
    const failed = [streakRes, profileRes, daysRes, setsRes].find((r) => r.error)?.error;
    if (failed) return { data: null, error: toApiError(failed) };

    const monthSets = ((setsRes.data ?? []) as unknown as MonthSetRow[]).flatMap((row) => {
      const sets = row.set_logs.filter((l) => l.is_completed && l.set_type !== "warmup").length;
      return row.exercises && row.workout_sessions && sets > 0
        ? [{ performedOn: row.workout_sessions.performed_on, muscleGroup: row.exercises.muscle_group, sets }]
        : [];
    });

    const data = buildStoryData({
      summary: {
        name: s.name,
        performedOn: s.performedOn,
        startedAt: s.startedAt,
        durationSeconds: s.durationSeconds,
        volumeKg: s.volumeKg,
        setCount: s.setCount,
        weightUnit: s.weightUnit,
        exercises: s.exercises.map((e) => ({
          name: e.name,
          muscleGroup: e.muscleGroup,
          sets: e.sets.map((x) => ({ setType: x.setType as SetType, weightKg: x.weightKg, reps: x.reps })),
          setCount: e.setCount,
          volumeKg: e.volumeKg,
        })),
        records: s.records,
      },
      streak: toStreakSummary(streakRes.data?.[0]),
      weeklyGoal: profileRes.data?.weekly_goal ?? null,
      trainingDays: (daysRes.data ?? []).map(toTrainingDay),
      monthSets,
    });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/** Garante em tempo de compilação que a implementação segue o contrato. */
export const shareApi = { getShareStoryData } satisfies ShareApi;
