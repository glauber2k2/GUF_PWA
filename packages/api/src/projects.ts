import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import { currentUserId, fetchTrainingTotals } from "./shared";

/* =====================================================================
 * Contrato
 * Edição de projetos e rotinas é SÓ ONLINE (sem fila offline): quem chama trata network_error.
 * ===================================================================== */

/** Exercício planejado (só o que o resumo da rotina usa). */
export interface PlannedSetup {
  targetSets: number | null;
  restSeconds: number | null;
}

export interface ProjectRoutine {
  id: string;
  name: string;
  position: number;
  /** Dias da semana (ISO: 1 = segunda … 7 = domingo); vazio = sem dia fixo. */
  weekdays: number[];
  exercises: PlannedSetup[];
  /** Média (s) dos últimos 5 treinos concluídos com a rotina (average_duration_seconds no banco); null = nunca treinada. */
  averageDurationSeconds: number | null;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  /** Projeto padrão "Favoritos": não pode ser renomeado, arquivado nem excluído. */
  isFavorites: boolean;
  /** ISO; null = em uso. */
  archivedAt: string | null;
  createdAt: string;
  /** Rotinas em uso (não arquivadas), em ordem. */
  routines: ProjectRoutine[];
}

export interface ProjectsOverview {
  projects: Project[];
  /** Último treino concluído com rotina (para a rotina sugerida do projeto ativo). */
  lastFinished: { routineId: string; performedOn: string } | null;
}

export interface ProjectInput {
  name: string;
  description: string;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface ProjectsApi {
  getProjectsOverview: (client: GufClient) => Result<ProjectsOverview>;
  /** Cria o projeto; com `activate`, ativa em seguida pela RPC (troca atômica). */
  createProject: (client: GufClient, input: ProjectInput & { activate: boolean }) => Result<{ id: string }>;
  updateProject: (client: GufClient, input: ProjectInput & { id: string }) => Result;
  /** Ativa e desativa o anterior na mesma transação (RPC activate_project). */
  activateProject: (client: GufClient, input: { projectId: string }) => Result;
  /** Fica sem projeto ativo. */
  deactivateProject: (client: GufClient, input: { projectId: string }) => Result;
  /** Arquiva (e desativa, se era o ativo). Treinos feitos continuam no histórico. */
  archiveProject: (client: GufClient, input: { projectId: string }) => Result;
  restoreProject: (client: GufClient, input: { projectId: string }) => Result;
  /** Exclui o projeto e as rotinas dele (o histórico de treinos fica). Favoritos é recusado (project_locked). */
  deleteProject: (client: GufClient, input: { projectId: string }) => Result;
  renameRoutine: (client: GufClient, input: { routineId: string; name: string }) => Result;
  archiveRoutine: (client: GufClient, input: { routineId: string }) => Result;
  restoreRoutine: (client: GufClient, input: { routineId: string }) => Result;
  /** Grava as positions que mudaram (ver changedPositions em @guf/core). */
  reorderRoutines: (client: GufClient, input: { positions: Array<{ id: string; position: number }> }) => Result;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

const ok = { data: null, error: null } as const;

/** Executa uma gravação simples e converte o erro. */
async function write(run: () => PromiseLike<{ error: unknown }>): Result {
  try {
    const { error } = await run();
    return error ? { data: null, error: toApiError(error) } : ok;
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export const getProjectsOverview: ProjectsApi["getProjectsOverview"] = async (client) => {
  try {
    const [projectsRes, lastRes] = await Promise.all([
      client
        .from("projects")
        .select(
          "id, name, description, is_active, is_favorites, archived_at, created_at, routines(id, name, position, weekdays, archived_at, average_duration_seconds, routine_exercises(target_sets, rest_seconds))",
        )
        .order("created_at", { ascending: false })
        .order("position", { referencedTable: "routines", ascending: true }),
      // Histórico inteiro: a rotina sugerida não depende do que o plano mostra.
      fetchTrainingTotals(client),
    ]);
    if (projectsRes.error) return { data: null, error: toApiError(projectsRes.error) };
    if (lastRes.error) return { data: null, error: toApiError(lastRes.error) };

    return {
      data: {
        projects: projectsRes.data.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          isActive: p.is_active,
          isFavorites: p.is_favorites,
          archivedAt: p.archived_at,
          createdAt: p.created_at,
          routines: p.routines
            .filter((r) => !r.archived_at)
            .map((r) => ({
              id: r.id,
              name: r.name,
              position: r.position,
              weekdays: r.weekdays,
              exercises: r.routine_exercises.map((e) => ({ targetSets: e.target_sets, restSeconds: e.rest_seconds })),
              averageDurationSeconds: r.average_duration_seconds ?? null,
            })),
        })),
        lastFinished:
          lastRes.data?.lastRoutine ?? null,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const activateProject: ProjectsApi["activateProject"] = (client, { projectId }) =>
  write(() => client.rpc("activate_project", { p_project_id: projectId }));

export const createProject: ProjectsApi["createProject"] = async (client, { name, description, activate }) => {
  try {
    const userId = await currentUserId(client);
    if (!userId) return { data: null, error: apiError("not_authenticated") };
    const { data, error } = await client
      .from("projects")
      .insert({ user_id: userId, name: name.trim(), description: description.trim() || null })
      .select("id")
      .single();
    if (error) return { data: null, error: toApiError(error) };
    if (activate) {
      // Projeto já criado; se a ativação falhar, ele fica na lista para ativar depois.
      const activated = await activateProject(client, { projectId: data.id });
      if (activated.error) return { data: null, error: activated.error };
    }
    return { data: { id: data.id }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const updateProject: ProjectsApi["updateProject"] = (client, { id, name, description }) =>
  write(() => client.from("projects").update({ name: name.trim(), description: description.trim() || null }).eq("id", id));

export const deactivateProject: ProjectsApi["deactivateProject"] = (client, { projectId }) =>
  write(() => client.from("projects").update({ is_active: false }).eq("id", projectId));

export const archiveProject: ProjectsApi["archiveProject"] = (client, { projectId }) =>
  write(() => client.from("projects").update({ archived_at: new Date().toISOString(), is_active: false }).eq("id", projectId));

export const restoreProject: ProjectsApi["restoreProject"] = (client, { projectId }) =>
  write(() => client.from("projects").update({ archived_at: null }).eq("id", projectId));

export const deleteProject: ProjectsApi["deleteProject"] = (client, { projectId }) =>
  write(() => client.from("projects").delete().eq("id", projectId));

export const renameRoutine: ProjectsApi["renameRoutine"] = (client, { routineId, name }) =>
  write(() => client.from("routines").update({ name: name.trim() }).eq("id", routineId));

export const archiveRoutine: ProjectsApi["archiveRoutine"] = (client, { routineId }) =>
  write(() => client.from("routines").update({ archived_at: new Date().toISOString() }).eq("id", routineId));

export const restoreRoutine: ProjectsApi["restoreRoutine"] = (client, { routineId }) =>
  write(() => client.from("routines").update({ archived_at: null }).eq("id", routineId));

export const reorderRoutines: ProjectsApi["reorderRoutines"] = async (client, { positions }) => {
  try {
    const results = await Promise.all(positions.map((p) => client.from("routines").update({ position: p.position }).eq("id", p.id)));
    const failed = results.find((r) => r.error);
    return failed?.error ? { data: null, error: toApiError(failed.error) } : ok;
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const projectsApi = {
  getProjectsOverview,
  createProject,
  updateProject,
  activateProject,
  deactivateProject,
  archiveProject,
  restoreProject,
  deleteProject,
  renameRoutine,
  archiveRoutine,
  restoreRoutine,
  reorderRoutines,
} satisfies ProjectsApi;
