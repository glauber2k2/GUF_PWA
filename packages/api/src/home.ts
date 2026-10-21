import { plannedSetValues, sessionTotals, type ActivePeriod, type SetType } from "@guf/core";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import {
  currentUserId,
  FREE_WORKOUT_NAME,
  resolveAvatarUrl,
  sessionDurationSeconds,
  toLoggedSets,
  toStreakSummary,
  toTrainingDay,
  type StreakSummary,
  type TrainingDay,
} from "./shared";
import { addWorkoutExercises, type NewWorkoutExercise } from "./workout";

export * from "./result";
export type { StreakSummary, TrainingDay } from "./shared";

/* =====================================================================
 * Contrato
 * ===================================================================== */

export interface PlannedExercise {
  name: string;
  /** Código de exercises.muscle_group (ex.: "biceps"); rótulo via muscleGroupLabel (@guf/core). */
  muscleGroup: string;
  targetSets: number | null;
  /** Texto livre da rotina: "10", "8-12", "falha". */
  targetReps: string | null;
  restSeconds: number | null;
}

export interface RoutineSummary {
  id: string;
  name: string;
  position: number;
  /** Dias da semana (ISO: 1 = segunda … 7 = domingo); define o treino de hoje. */
  weekdays: number[];
  /** Exercícios na ordem planejada. */
  exercises: PlannedExercise[];
  /** Média (s) dos últimos 5 treinos concluídos com a rotina (average_duration_seconds no banco); null = nunca treinada. */
  averageDurationSeconds: number | null;
}

/** Treino concluído (resumo para o card de hoje e para a folha do dia). */
export interface FinishedSession {
  id: string;
  routineId: string | null;
  /** Nome exibido: snapshot do nome da rotina ou "Treino livre". */
  name: string;
  /** Data local "yyyy-MM-dd". */
  performedOn: string;
  durationSeconds: number;
  volumeKg: number;
  setCount: number;
}

/** Treino em andamento (no máximo 1 por usuário). */
export interface InProgressSession {
  id: string;
  routineId: string | null;
  name: string;
  performedOn: string;
  /** ISO timestamp de início. */
  startedAt: string;
  /** Períodos em que o treino estava rodando (relógio do mini card). */
  activePeriods: ActivePeriod[];
}

export interface HomeSummary {
  profile: {
    name: string | null;
    /** Foto a exibir (enviada > Google > null = inicial). */
    avatarUrl: string | null;
    /** Meta semanal (só exibição). */
    weeklyGoal: number | null;
  };
  /** Projeto ativo com suas rotinas (ordenadas por position); null se não houver. */
  activeProject: { id: string; name: string; routines: RoutineSummary[] } | null;
  /** true se o usuário tem alguma rotina (em qualquer projeto) — diferencia "novo" de "sem plano". */
  hasAnyRoutine: boolean;
  /** Rotina do último treino concluído (para sugerir a próxima). */
  lastFinishedRoutineId: string | null;
  /** Calendário da semana (seg–dom): get_training_days. */
  trainingDays: TrainingDay[];
  /** Treinos concluídos na semana, com duração/volume/séries (card de hoje e folha do dia). */
  weekSessions: FinishedSession[];
  inProgress: InProgressSession | null;
  streak: StreakSummary;
}

export interface GetHomeSummaryInput {
  /** Hoje, data local "yyyy-MM-dd". */
  today: string;
  /** Segunda e domingo da semana atual, datas locais "yyyy-MM-dd". */
  weekStart: string;
  weekEnd: string;
}

export type GetHomeSummary = (client: GufClient, input: GetHomeSummaryInput) => Promise<ApiResult<HomeSummary>>;

export interface StartWorkoutInput {
  /** Rotina escolhida; null = treino livre (vazio). */
  routineId: string | null;
  /** Data LOCAL do usuário "yyyy-MM-dd" (nunca o padrão UTC do banco). */
  performedOn: string;
}

/** Cria a sessão de treino (o banco recusa um segundo treino em andamento). */
export type StartWorkout = (client: GufClient, input: StartWorkoutInput) => Promise<ApiResult<{ sessionId: string }>>;

export interface HomeApi {
  getHomeSummary: GetHomeSummary;
  startWorkout: StartWorkout;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const DEFAULT_PLANNED_SETS = 3;

export const getHomeSummary: GetHomeSummary = async (client, { weekStart, weekEnd }) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };

    const [profileRes, projectRes, anyRoutineRes, lastRes, weekRes, inProgressRes, daysRes, streakRes] = await Promise.all([
      client.from("profiles").select("name, avatar_url, weekly_goal").eq("id", userId).maybeSingle(),
      client.from("projects").select("id, name").eq("is_active", true).is("archived_at", null).maybeSingle(),
      client.from("routines").select("id", { count: "exact", head: true }).is("archived_at", null),
      client
        .from("workout_sessions")
        .select("routine_id")
        .eq("status", "completed")
        .not("routine_id", "is", null)
        .order("performed_on", { ascending: false })
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("workout_sessions")
        .select("id, routine_id, name, performed_on, started_at, finished_at, active_seconds, set_logs(set_type, weight_kg, reps, is_completed)")
        .eq("status", "completed")
        .gte("performed_on", weekStart)
        .lte("performed_on", weekEnd)
        .order("finished_at", { ascending: true }),
      client
        .from("workout_sessions")
        .select("id, routine_id, name, performed_on, started_at, workout_active_periods(started_at, ended_at)")
        .eq("status", "in_progress")
        .maybeSingle(),
      client.rpc("get_training_days", { p_from: weekStart, p_to: weekEnd }),
      client.rpc("get_streak"),
    ]);

    const firstError = [profileRes, projectRes, anyRoutineRes, lastRes, weekRes, inProgressRes, daysRes, streakRes].find(
      (r) => r.error,
    )?.error;
    if (firstError) return { data: null, error: toApiError(firstError) };

    // Rotinas do projeto ativo, com exercícios planejados na ordem.
    let activeProject: HomeSummary["activeProject"] = null;
    if (projectRes.data) {
      const routinesRes = await client
        .from("routines")
        .select(
          "id, name, position, weekdays, average_duration_seconds, routine_exercises(position, target_sets, target_reps, rest_seconds, exercises(name, muscle_group))",
        )
        .eq("project_id", projectRes.data.id)
        .is("archived_at", null)
        .order("position", { ascending: true })
        .order("position", { referencedTable: "routine_exercises", ascending: true });
      if (routinesRes.error) return { data: null, error: toApiError(routinesRes.error) };

      activeProject = {
        id: projectRes.data.id,
        name: projectRes.data.name,
        routines: routinesRes.data.map((r) => ({
          id: r.id,
          name: r.name,
          position: r.position,
          weekdays: r.weekdays,
          exercises: r.routine_exercises.map((re) => ({
            name: re.exercises?.name ?? "Exercício",
            muscleGroup: re.exercises?.muscle_group ?? "",
            targetSets: re.target_sets,
            targetReps: re.target_reps,
            restSeconds: re.rest_seconds,
          })),
          averageDurationSeconds: r.average_duration_seconds ?? null,
        })),
      };
    }

    const weekSessions: FinishedSession[] = (weekRes.data ?? []).map((s) => {
      const totals = sessionTotals(toLoggedSets(s.set_logs));
      return {
        id: s.id,
        routineId: s.routine_id,
        name: s.name ?? FREE_WORKOUT_NAME,
        performedOn: s.performed_on,
        durationSeconds: sessionDurationSeconds(s),
        volumeKg: totals.volumeKg,
        setCount: totals.setCount,
      };
    });

    // Foto social atual vem da sessão (lida do armazenamento local, sem ir à rede).
    const sessionUser = (await client.auth.getSession()).data.session?.user;
    const summary: HomeSummary = {
      profile: {
        name: profileRes.data?.name ?? null,
        avatarUrl: resolveAvatarUrl(client, profileRes.data?.avatar_url, sessionUser),
        weeklyGoal: profileRes.data?.weekly_goal ?? null,
      },
      activeProject,
      hasAnyRoutine: (anyRoutineRes.count ?? 0) > 0,
      lastFinishedRoutineId: lastRes.data?.routine_id ?? null,
      trainingDays: (daysRes.data ?? []).map(toTrainingDay),
      weekSessions,
      inProgress: inProgressRes.data
        ? {
            id: inProgressRes.data.id,
            routineId: inProgressRes.data.routine_id,
            name: inProgressRes.data.name ?? FREE_WORKOUT_NAME,
            performedOn: inProgressRes.data.performed_on,
            startedAt: inProgressRes.data.started_at,
            activePeriods: inProgressRes.data.workout_active_periods.map((p) => ({
              startedAt: p.started_at,
              endedAt: p.ended_at,
            })),
          }
        : null,
      streak: toStreakSummary(streakRes.data?.[0]),
    };
    return { data: summary, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/**
 * Inicia o treino: cria a sessão (performed_on local, nome da rotina como snapshot; o gatilho
 * abre o 1º período ativo), copia os exercícios da rotina e já cria as séries planejadas
 * (target_sets). Carga e repetições: com a rotina em "atualizar automaticamente", as do último
 * desempenho (ou as reps alvo); senão, as planejadas na rotina (ou vazio) — plannedSetValues.
 * Se algo falhar, a sessão recém-criada é apagada (sem treino "pela metade").
 */
export const startWorkout: StartWorkout = async (client, { routineId, performedOn }) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };

    let name = FREE_WORKOUT_NAME;
    let planned: {
      exercise_id: string;
      position: number;
      target_sets: number | null;
      target_reps: string | null;
      target_weight_kg: number | null;
    }[] = [];
    let autoProgress = true;
    if (routineId) {
      const routineRes = await client
        .from("routines")
        .select("name, auto_progress, routine_exercises(exercise_id, position, target_sets, target_reps, target_weight_kg)")
        .eq("id", routineId)
        .maybeSingle();
      if (routineRes.error || !routineRes.data) return { data: null, error: toApiError(routineRes.error) };
      name = routineRes.data.name;
      autoProgress = routineRes.data.auto_progress;
      planned = [...routineRes.data.routine_exercises].sort((a, b) => a.position - b.position);
    }

    const lastRes = planned.length
      ? await client.rpc("get_last_performance", { p_exercise_ids: planned.map((p) => p.exercise_id) })
      : { data: [], error: null };
    if (lastRes.error) return { data: null, error: toApiError(lastRes.error) };

    const sessionRes = await client
      .from("workout_sessions")
      .insert({ user_id: userId, routine_id: routineId, name, performed_on: performedOn })
      .select("id")
      .single();
    if (sessionRes.error) return { data: null, error: toApiError(sessionRes.error) };
    const sessionId = sessionRes.data.id;

    const exercises: NewWorkoutExercise[] = planned.map((p, position) => {
      const previous = (lastRes.data ?? []).filter((l) => l.exercise_id === p.exercise_id);
      const count = p.target_sets ?? Math.max(previous.length, DEFAULT_PLANNED_SETS);
      const lastPrev = previous[previous.length - 1];
      return {
        id: crypto.randomUUID(),
        exerciseId: p.exercise_id,
        position,
        sets: Array.from({ length: count }, (_, i) => {
          const prev = previous.find((l) => l.set_number === i + 1) ?? lastPrev;
          const values = plannedSetValues(autoProgress, prev && { weightKg: prev.weight_kg, reps: prev.reps }, {
            weightKg: p.target_weight_kg === null ? null : Number(p.target_weight_kg),
            targetReps: p.target_reps,
          });
          return {
            id: crypto.randomUUID(),
            setNumber: i + 1,
            setType: "normal" as SetType,
            weightKg: values.weightKg,
            reps: values.reps,
            // Cardio: distância e tempo do último treino (não há planejado na rotina).
            distanceKm: prev?.distance_km == null ? null : Number(prev.distance_km),
            durationSeconds: prev?.duration_seconds ?? null,
            isCompleted: false,
          };
        }),
      };
    });

    if (exercises.length > 0) {
      const added = await addWorkoutExercises(client, { sessionId, exercises });
      if (added.error) {
        await client.from("workout_sessions").delete().eq("id", sessionId);
        return { data: null, error: added.error };
      }
    }
    return { data: { sessionId }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/** Garante em tempo de compilação que a implementação segue o contrato. */
export const homeApi = { getHomeSummary, startWorkout } satisfies HomeApi;
