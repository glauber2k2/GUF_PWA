import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";

/* =====================================================================
 * Contrato — edição de rotina (SÓ ONLINE: quem chama trata network_error)
 * ===================================================================== */

/** Exercício planejado da rotina (rascunho da tela; id gerado no app para os novos). */
export interface RoutineExerciseDraft {
  id: string;
  exerciseId: string;
  name: string;
  /** Código de exercises.muscle_group; rótulo via muscleGroupLabel (@guf/core). */
  muscleGroup: string;
  /** Código de exercises.equipment; rótulo via equipmentLabel (@guf/core). */
  equipment: string;
  targetSets: number;
  /** Texto livre: "10", "8-12", "falha". */
  targetReps: string;
  restSeconds: number;
  notes: string;
}

export interface RoutineDraft {
  /** null = rotina nova. */
  id: string | null;
  projectId: string;
  name: string;
  /** Dias da semana (ISO: 1 = segunda … 7 = domingo). */
  weekdays: number[];
  /** Na ordem da rotina. */
  exercises: RoutineExerciseDraft[];
}

export interface RoutinesApi {
  /** Rotina para edição (só não arquivada). */
  getRoutine: (client: GufClient, input: { routineId: string }) => Promise<ApiResult<RoutineDraft>>;
  /** Cria ou atualiza nome, projeto, dias e exercícios numa transação (RPC save_routine). */
  saveRoutine: (client: GufClient, input: RoutineDraft) => Promise<ApiResult<{ id: string }>>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

/** Valores do banco quando a rotina não definiu meta (mesmos padrões do resumo da rotina). */
const DEFAULT_SETS = 3;
const DEFAULT_REST_SECONDS = 90;

export const getRoutine: RoutinesApi["getRoutine"] = async (client, { routineId }) => {
  try {
    const { data, error } = await client
      .from("routines")
      .select(
        "id, project_id, name, weekdays, archived_at, routine_exercises(id, exercise_id, position, target_sets, target_reps, rest_seconds, notes, exercises(name, muscle_group, equipment))",
      )
      .eq("id", routineId)
      .order("position", { referencedTable: "routine_exercises", ascending: true })
      .maybeSingle();
    if (error) return { data: null, error: toApiError(error) };
    if (!data || data.archived_at || !data.project_id) return { data: null, error: apiError("routine_not_found") };
    return {
      data: {
        id: data.id,
        projectId: data.project_id,
        name: data.name,
        weekdays: data.weekdays,
        exercises: data.routine_exercises.map((re) => ({
          id: re.id,
          exerciseId: re.exercise_id,
          name: re.exercises?.name ?? "Exercício",
          muscleGroup: re.exercises?.muscle_group ?? "",
          equipment: re.exercises?.equipment ?? "outro",
          targetSets: re.target_sets ?? DEFAULT_SETS,
          targetReps: re.target_reps ?? "",
          restSeconds: re.rest_seconds ?? DEFAULT_REST_SECONDS,
          notes: re.notes ?? "",
        })),
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const saveRoutine: RoutinesApi["saveRoutine"] = async (client, draft) => {
  try {
    const { data, error } = await client.rpc("save_routine", {
      // Rotina nova: o banco cria (o tipo gerado não marca o parâmetro como opcional).
      p_routine_id: draft.id as string,
      p_project_id: draft.projectId,
      p_name: draft.name.trim(),
      p_weekdays: [...new Set(draft.weekdays)].sort((a, b) => a - b),
      p_exercises: draft.exercises.map((e) => ({
        id: e.id,
        exercise_id: e.exerciseId,
        target_sets: e.targetSets,
        target_reps: e.targetReps.trim(),
        rest_seconds: e.restSeconds,
        notes: e.notes.trim(),
      })),
    });
    if (error) return { data: null, error: toApiError(error) };
    return { data: { id: data }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const routinesApi = { getRoutine, saveRoutine } satisfies RoutinesApi;
