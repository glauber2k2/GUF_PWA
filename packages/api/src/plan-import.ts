import { FunctionsHttpError } from "@supabase/supabase-js";
import { normalizeSearch } from "@guf/core";
import { planImportDraftSchema, type PlanImportDraft } from "@guf/schemas";
import type { GufClient } from "./client";
import { AI_FUNCTION, toAiError } from "./ai";
import { apiError, toApiError, type ApiError, type ApiResult } from "./result";

/* =====================================================================
 * Contrato — Importar ficha de treino com o GUF AI. SÓ ONLINE.
 * 1. convertTrainingPlan: a Edge Function guf-ai converte o texto colado num rascunho (projeto,
 *    rotinas e exercícios). Exercício que é o mesmo de um do CATÁLOGO DO GUF usa o do catálogo;
 *    o resto vira "novo" (exercícios criados por outras pessoas nunca entram). Nada é gravado.
 * 2. importTrainingPlan: a pessoa revisa e cria tudo numa transação (RPC import_training_plan). Cada
 *    rotina da ficha vira uma rotina nova ou vai para o fim de uma que já existe no projeto escolhido.
 * ===================================================================== */

export type { PlanImportDraft, PlanImportExercise, PlanImportMatch, PlanImportRoutine } from "@guf/schemas";

/** Onde as rotinas entram: projeto novo (com o nome do rascunho) ou um projeto que já existe. */
export type PlanImportDestination = { kind: "new"; activate: boolean } | { kind: "existing"; projectId: string };

type Result<T = null> = Promise<ApiResult<T>>;

export interface PlanImportApi {
  /** Converte o texto da ficha (até PLAN_IMPORT_MAX_CHARS) num rascunho; conta como uma pergunta do GUF AI. */
  convertTrainingPlan: (client: GufClient, input: { text: string }) => Result<PlanImportDraft>;
  /** Cria o projeto (ou usa o escolhido), os exercícios novos e as rotinas (ou completa as existentes); devolve o projeto. */
  importTrainingPlan: (client: GufClient, input: { draft: PlanImportDraft; destination: PlanImportDestination }) => Result<{ projectId: string }>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

/** Corpo do pedido de conversão (o chat usa outro formato, sem `kind`). */
interface PlanImportRequest {
  kind: "plan-import";
  text: string;
}

const HTTP_BAD_REQUEST = 400;
const HTTP_UNPROCESSABLE = 422;

function toPlanImportError(status: number): ApiError {
  if (status === HTTP_BAD_REQUEST) return apiError("plan_import_invalid");
  if (status === HTTP_UNPROCESSABLE) return apiError("plan_import_empty");
  return toAiError(status);
}

export const convertTrainingPlan: PlanImportApi["convertTrainingPlan"] = async (client, { text }) => {
  try {
    const body: PlanImportRequest = { kind: "plan-import", text };
    const { data, error } = await client.functions.invoke<unknown>(AI_FUNCTION, { body });
    if (error instanceof FunctionsHttpError) return { data: null, error: toPlanImportError((error.context as Response).status) };
    if (error) return { data: null, error: toApiError(error) };
    // Resposta de um modelo de IA a partir de texto colado: só entra o que passa no schema.
    const parsed = planImportDraftSchema.safeParse(data);
    return parsed.success ? { data: parsed.data, error: null } : { data: null, error: apiError("ai_unavailable") };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

/** Exercício novo citado em várias rotinas vira um só (mesmo nome, sem acento e caixa). */
const newExerciseKey = (name: string) => normalizeSearch(name);

/** Rascunho → parâmetros da RPC (exercício existente pelo id; novo pela chave do nome). */
function toImportParams(draft: PlanImportDraft) {
  const newExercises = new Map<string, { key: string; name: string; muscle_group: string; equipment: string }>();
  const routines = draft.routines.map((routine) => ({
    ...(routine.intoRoutineId ? { routine_id: routine.intoRoutineId } : {}),
    name: routine.name.trim(),
    weekdays: [...new Set(routine.weekdays)].sort((a, b) => a - b),
    exercises: routine.exercises.map((exercise) => {
      const planned = {
        target_sets: exercise.targetSets,
        target_reps: exercise.targetReps.trim(),
        rest_seconds: exercise.restSeconds,
        notes: exercise.notes.trim(),
      };
      if (exercise.match.kind !== "new") return { ...planned, exercise_id: exercise.match.exerciseId };
      const key = newExerciseKey(exercise.match.name);
      if (!newExercises.has(key)) {
        newExercises.set(key, { key, name: exercise.match.name.trim(), muscle_group: exercise.match.muscleGroup, equipment: exercise.match.equipment });
      }
      return { ...planned, new_key: key };
    }),
  }));
  return { newExercises: [...newExercises.values()], routines };
}

export const importTrainingPlan: PlanImportApi["importTrainingPlan"] = async (client, { draft, destination }) => {
  try {
    const parsed = planImportDraftSchema.safeParse(draft);
    if (!parsed.success) return { data: null, error: apiError("plan_import_invalid") };
    const { newExercises, routines } = toImportParams(parsed.data);
    const { data, error } = await client.rpc("import_training_plan", {
      // Projeto novo: o banco cria (o tipo gerado não marca o parâmetro como opcional).
      p_project_id: (destination.kind === "existing" ? destination.projectId : null) as string,
      p_project_name: parsed.data.projectName.trim(),
      p_activate: destination.kind === "new" && destination.activate,
      p_new_exercises: newExercises,
      p_routines: routines,
    });
    if (error) return { data: null, error: toApiError(error) };
    return { data: { projectId: data }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const planImportApi = { convertTrainingPlan, importTrainingPlan } satisfies PlanImportApi;
