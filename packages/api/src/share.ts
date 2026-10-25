import { buildStoryData, setMetricKind, storyContextRange, storyFeaturedFrom, type SetType, type StoryData, type StoryInput } from "@guf/core";
import type { GufClient } from "./client";
import { getWorkoutSummary, type LoadSummaryRecord } from "./evolution";
import { currentUserId, fetchTrainingTotals, toStreakSummary, toTrainingDay } from "./shared";
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

interface ProjectSetRow {
  set_logs: Array<{ set_type: string; is_completed: boolean; weight_kg: number | null; reps: number | null }>;
}

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

    const extras = await loadStoryExtras(client, s);
    if (extras.error) return { data: null, error: toApiError(extras.error) };

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
        // Cardio fica fora das imagens até ter modelos próprios (distância, tempo e ritmo).
        exercises: s.exercises.filter((e) => setMetricKind(e.muscleGroup) !== "cardio").map((e) => ({
          name: e.name,
          muscleGroup: e.muscleGroup,
          sets: e.sets.map((x) => ({
            setType: x.setType as SetType,
            weightKg: x.weightKg,
            reps: x.reps,
            completedAt: extras.completedAt.get(`${e.id}:${x.setNumber}`) ?? null,
          })),
          setCount: e.setCount,
          volumeKg: e.volumeKg,
        })),
        records: s.records.filter((r): r is LoadSummaryRecord => r.metric === "load"),
      },
      streak: toStreakSummary(streakRes.data?.[0]),
      weeklyGoal: profileRes.data?.weekly_goal ?? null,
      trainingDays: (daysRes.data ?? []).map(toTrainingDay),
      monthSets,
      history: extras.history,
      featured: extras.featured,
      monthActiveSeconds: extras.monthActiveSeconds,
      project: extras.project,
    });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

type Summary = Extract<Awaited<ReturnType<typeof getWorkoutSummary>>, { error: null }>["data"];

interface StoryExtras {
  error: unknown;
  /** Hora de conclusão por "<session_exercise_id>:<set_number>". */
  completedAt: Map<string, string>;
  history: StoryInput["history"];
  featured: StoryInput["featured"];
  monthActiveSeconds: number;
  project: StoryInput["project"];
}

/** Contexto extra dos PNGs: horários das séries, marco de treinos, exercício em destaque, mês e projeto. */
async function loadStoryExtras(client: GufClient, s: Summary): Promise<StoryExtras> {
  const monthFrom = `${s.performedOn.slice(0, 7)}-01`;
  const featuredExercise =
    s.records[0]?.exerciseId ?? [...s.exercises].sort((a, b) => b.volumeKg - a.volumeKg).find((e) => e.volumeKg > 0)?.exerciseId ?? null;
  const [timesRes, totalsRes, monthRes, featuredRes, routineRes] = await Promise.all([
    client.from("set_logs").select("session_exercise_id, set_number, completed_at").eq("session_id", s.id).eq("is_completed", true),
    // Marco de treinos pelo histórico inteiro (não depende do que o plano mostra).
    fetchTrainingTotals(client, s.performedOn),
    client
      .from("workout_sessions")
      .select("active_seconds, started_at, finished_at")
      .eq("status", "completed")
      .gte("performed_on", monthFrom)
      .lte("performed_on", s.performedOn),
    featuredExercise
      ? client.rpc("get_exercise_history", { p_exercise_id: featuredExercise, p_from: storyFeaturedFrom(s.performedOn) })
      : Promise.resolve({ data: [], error: null }),
    s.routineId ? client.from("routines").select("project_id").eq("id", s.routineId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  const failed = [timesRes, totalsRes, monthRes, featuredRes, routineRes].find((r) => r.error)?.error;
  const empty: StoryExtras = {
    error: failed ?? null,
    completedAt: new Map(),
    history: { totalWorkouts: 0, firstWorkoutOn: null },
    featured: null,
    monthActiveSeconds: 0,
    project: null,
  };
  if (failed) return empty;

  const completedAt = new Map<string, string>();
  for (const row of timesRes.data ?? []) if (row.completed_at) completedAt.set(`${row.session_exercise_id}:${row.set_number}`, row.completed_at);

  const monthActiveSeconds = (monthRes.data ?? []).reduce((n, w) => {
    const elapsed = w.finished_at ? (new Date(w.finished_at).getTime() - new Date(w.started_at).getTime()) / 1000 : 0;
    return n + Math.max(0, w.active_seconds ?? elapsed);
  }, 0);

  const exerciseName = s.exercises.find((e) => e.exerciseId === featuredExercise)?.name ?? null;
  const points = (featuredRes.data ?? [])
    .filter((p) => p.performed_on <= s.performedOn)
    .sort((a, b) => a.performed_on.localeCompare(b.performed_on))
    .map((p) => ({ performedOn: p.performed_on, maxWeightKg: Number(p.max_weight_kg), e1rmKg: Number(p.best_e1rm_kg) }));

  let project: StoryInput["project"] = null;
  const projectId = routineRes.data?.project_id ?? null;
  if (projectId && s.projectName) {
    const [sessionsRes, setsRes] = await Promise.all([
      client
        .from("workout_sessions")
        .select("performed_on, routines!inner(project_id)")
        .eq("status", "completed")
        .eq("routines.project_id", projectId)
        .lte("performed_on", s.performedOn)
        .order("performed_on"),
      client
        .from("session_exercises")
        .select("set_logs(set_type, is_completed, weight_kg, reps), workout_sessions!inner(status, performed_on, routines!inner(project_id))")
        .eq("workout_sessions.status", "completed")
        .eq("workout_sessions.routines.project_id", projectId)
        .lte("workout_sessions.performed_on", s.performedOn),
    ]);
    const projectFailed = sessionsRes.error ?? setsRes.error;
    if (projectFailed) return { ...empty, error: projectFailed };
    const sessions = sessionsRes.data ?? [];
    const volumeKg = ((setsRes.data ?? []) as unknown as ProjectSetRow[]).reduce(
      (n, row) => n + row.set_logs.filter((l) => l.is_completed && l.set_type !== "warmup").reduce((m, l) => m + (l.weight_kg ?? 0) * (l.reps ?? 0), 0),
      0,
    );
    if (sessions[0]) project = { name: s.projectName, workouts: sessions.length, volumeKg, firstOn: sessions[0].performed_on };
  }

  return {
    error: null,
    completedAt,
    history: { totalWorkouts: totalsRes.data?.completedSessions ?? 0, firstWorkoutOn: totalsRes.data?.firstTrainedOn ?? null },
    featured: exerciseName ? { exerciseName, points } : null,
    monthActiveSeconds,
    project,
  };
}

/** Garante em tempo de compilação que a implementação segue o contrato. */
export const shareApi = { getShareStoryData } satisfies ShareApi;
