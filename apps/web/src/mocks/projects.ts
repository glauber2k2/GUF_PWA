/**
 * MOCK dos Projetos — mesmo contrato de @guf/api (ProjectsApi).
 *
 * A tela usa os DADOS REAIS (packages/api). Este mock existe só para visualizar os estados do
 * design em DESENVOLVIMENTO, via ?estado= (ver useDevProjectsState):
 * padrao · nenhum-ativo · novo · sem-rotinas · erro (+ carregando, offline e queda, que são da tela).
 * As gravações alteram a memória do mock (a demonstração funciona até recarregar a página).
 */
import { apiError, type ApiResult, type GufClient, type Project, type ProjectRoutine, type ProjectsApi } from "@guf/api";
import { nextPosition, toLocalISODate } from "@guf/core";

export type ProjectsMockScenario = "padrao" | "nenhum-ativo" | "novo" | "sem-rotinas" | "erro";

const LATENCY_MS = 450;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

function ignoreClient(client: GufClient) {
  void client;
}

const planned = (count: number) => Array.from({ length: count }, () => ({ targetSets: 3, restSeconds: 90 }));
const routine = (
  id: string,
  name: string,
  position: number,
  exercises: number,
  weekdays: number[] = [],
  averageDurationSeconds: number | null = null,
): ProjectRoutine => ({
  id,
  name,
  position,
  weekdays,
  exercises: planned(exercises),
  averageDurationSeconds,
});

/** Projeto padrão de todo usuário (fixo; criado no cadastro). */
const favorites = (isActive: boolean, routines: ProjectRoutine[] = []): Project => ({
  id: "p-favoritos",
  name: "Favoritos",
  description: null,
  isActive,
  isFavorites: true,
  archivedAt: null,
  createdAt: "2026-01-01T12:00:00Z",
  routines,
});

function seed(scenario: ProjectsMockScenario): Project[] {
  // Usuário novo: só o Favoritos (ativo, sem rotinas).
  if (scenario === "novo") return [favorites(true)];
  const projects: Project[] = [
    favorites(false, [routine("r-fav", "Peito em casa", 1, 4)]),
    {
      id: "p-abc",
      name: "Hipertrofia 2026 – ABC",
      description: "Foco em volume, 3 vezes por semana.",
      isActive: scenario !== "nenhum-ativo",
      isFavorites: false,
      archivedAt: null,
      createdAt: "2026-09-02T12:00:00Z",
      routines: [
        routine("r-a", "Treino A – Peito e Tríceps", 1, 6, [1, 4], 3120),
        routine("r-b", "Treino B – Costas e Bíceps", 2, 6, [2, 5], 2820),
        routine("r-c", "Treino C – Pernas e Ombros", 3, 7, [3, 6]),
      ],
    },
    {
      id: "p-5x5",
      name: "Força 5x5",
      description: "Básicos pesados com progressão linear.",
      isActive: false,
      isFavorites: false,
      archivedAt: null,
      createdAt: "2026-08-01T12:00:00Z",
      routines:
        scenario === "sem-rotinas"
          ? []
          : [routine("r-5a", "Treino A – Agachamento e Supino", 1, 4), routine("r-5b", "Treino B – Agachamento e Terra", 2, 4)],
    },
    {
      id: "p-core",
      name: "Mobilidade e core",
      description: null,
      isActive: false,
      isFavorites: false,
      archivedAt: null,
      createdAt: "2026-07-01T12:00:00Z",
      routines: [routine("r-core", "Core e alongamento", 1, 5)],
    },
    {
      id: "p-2025",
      name: "Adaptação 2025",
      description: null,
      isActive: false,
      isFavorites: false,
      archivedAt: "2026-03-10T12:00:00Z",
      createdAt: "2025-01-10T12:00:00Z",
      routines: [routine("r-fa", "Full body A", 1, 6), routine("r-fb", "Full body B", 2, 6)],
    },
  ];
  return projects;
}

let scenario: ProjectsMockScenario = "padrao";
let dropOnSave = false;
let store: Project[] = seed(scenario);
/** Rotinas arquivadas no mock (para o "Desfazer"). */
const archivedRoutines = new Map<string, { projectId: string; routine: ProjectRoutine }>();
let uid = 0;

/** Define o cenário (recria os dados ao trocar) e se as gravações simulam queda de conexão. */
export function setProjectsMockOptions(next: { scenario: ProjectsMockScenario; dropOnSave: boolean }) {
  if (next.scenario !== scenario) {
    scenario = next.scenario;
    store = seed(scenario);
    archivedRoutines.clear();
  }
  dropOnSave = next.dropOnSave;
}

/** Altera um projeto da memória; false se ele não existe. */
const updateProject = (id: string, fn: (p: Project) => Project): boolean => {
  if (!store.some((p) => p.id === id)) return false;
  store = store.map((p) => (p.id === id ? fn(p) : p));
  return true;
};
const findRoutineProject = (routineId: string) => store.find((p) => p.routines.some((r) => r.id === routineId));

/** Gravação do mock com retorno: simula latência e queda de conexão; null = projeto/rotina inexistente. */
async function mutate<T>(client: GufClient, run: () => T | null): Promise<ApiResult<T>> {
  ignoreClient(client);
  await wait();
  if (dropOnSave) return { data: null, error: apiError("network_error") };
  const data = run();
  return data === null ? { data: null, error: apiError("project_not_found") } : { data, error: null };
}

/** Gravação do mock sem retorno: `run` devolve false quando o alvo não existe. */
async function mutateVoid(client: GufClient, run: () => boolean): Promise<ApiResult<null>> {
  const res = await mutate(client, () => (run() ? true : null));
  return res.error ? res : { data: null, error: null };
}

export const mockProjectsApi = {
  async getProjectsOverview(client) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("unknown") };
    return {
      data: {
        projects: structuredClone(store),
        lastFinished: scenario === "novo" ? null : { routineId: "r-a", performedOn: toLocalISODate(new Date(Date.now() - 2 * 86_400_000)) },
      },
      error: null,
    };
  },
  createProject: (client, { name, description, activate }) =>
    mutate(client, () => {
      const id = `p-${++uid}`;
      if (activate) store = store.map((p) => ({ ...p, isActive: false }));
      const created: Project = {
        id,
        name: name.trim(),
        description: description.trim() || null,
        isActive: activate,
        isFavorites: false,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        routines: [],
      };
      store = [created, ...store];
      return { id };
    }),
  updateProject: (client, { id, name, description }) =>
    mutateVoid(client, () => updateProject(id, (p) => ({ ...p, name: name.trim(), description: description.trim() || null }))),
  activateProject: (client, { projectId }) =>
    mutateVoid(client, () => {
      if (!store.some((p) => p.id === projectId && !p.archivedAt)) return false;
      store = store.map((p) => ({ ...p, isActive: p.id === projectId }));
      return true;
    }),
  deactivateProject: (client, { projectId }) => mutateVoid(client, () => updateProject(projectId, (p) => ({ ...p, isActive: false }))),
  archiveProject: (client, { projectId }) =>
    store.find((p) => p.id === projectId)?.isFavorites
      ? Promise.resolve({ data: null, error: apiError("project_locked") })
      : mutateVoid(client, () => updateProject(projectId, (p) => ({ ...p, isActive: false, archivedAt: new Date().toISOString() }))),
  restoreProject: (client, { projectId }) => mutateVoid(client, () => updateProject(projectId, (p) => ({ ...p, archivedAt: null }))),
  deleteProject: (client, { projectId }) =>
    store.find((p) => p.id === projectId)?.isFavorites
      ? Promise.resolve({ data: null, error: apiError("project_locked") })
      : mutateVoid(client, () => {
          if (!store.some((p) => p.id === projectId)) return false;
          store = store.filter((p) => p.id !== projectId);
          return true;
        }),
  renameRoutine: (client, { routineId, name }) =>
    mutateVoid(client, () => {
      const project = findRoutineProject(routineId);
      return project
        ? updateProject(project.id, (p) => ({ ...p, routines: p.routines.map((r) => (r.id === routineId ? { ...r, name: name.trim() } : r)) }))
        : false;
    }),
  archiveRoutine: (client, { routineId }) =>
    mutateVoid(client, () => {
      const project = findRoutineProject(routineId);
      const target = project?.routines.find((r) => r.id === routineId);
      if (!project || !target) return false;
      archivedRoutines.set(routineId, { projectId: project.id, routine: target });
      return updateProject(project.id, (p) => ({ ...p, routines: p.routines.filter((r) => r.id !== routineId) }));
    }),
  deleteRoutine: (client, { routineId }) =>
    mutateVoid(client, () => {
      const project = findRoutineProject(routineId);
      return project ? updateProject(project.id, (p) => ({ ...p, routines: p.routines.filter((r) => r.id !== routineId) })) : false;
    }),
  restoreRoutine: (client, { routineId }) =>
    mutateVoid(client, () => {
      const saved = archivedRoutines.get(routineId);
      if (!saved) return false;
      archivedRoutines.delete(routineId);
      return updateProject(saved.projectId, (p) => ({ ...p, routines: [...p.routines, saved.routine].sort((a, b) => a.position - b.position) }));
    }),
  reorderRoutines: (client, { positions }) =>
    mutateVoid(client, () => {
      const byId = new Map(positions.map((p) => [p.id, p.position]));
      store = store.map((p) => ({
        ...p,
        routines: p.routines.map((r) => ({ ...r, position: byId.get(r.id) ?? r.position })).sort((a, b) => a.position - b.position),
      }));
      return true;
    }),
} satisfies ProjectsApi;

/* ---------------------------------------------------------------------
 * Apoio ao mock da tela de Rotina (mocks/routines.ts): mesma memória dos projetos.
 * --------------------------------------------------------------------- */

/** As gravações devem simular queda de conexão? */
export function mockDropsOnSave(): boolean {
  return dropOnSave;
}

/** Projeto e rotina (em uso) pelo id da rotina. */
export function findMockRoutine(routineId: string): { project: Project; routine: ProjectRoutine } | null {
  const project = findRoutineProject(routineId);
  const target = project?.routines.find((r) => r.id === routineId);
  return project && target ? { project, routine: target } : null;
}

/** Grava o resumo da rotina na memória (nome, dias, projeto e exercícios planejados). */
export function saveMockRoutine(input: { id: string; projectId: string; name: string; weekdays: number[]; exercises: ProjectRoutine["exercises"] }): boolean {
  const target = store.find((p) => p.id === input.projectId && !p.archivedAt);
  if (!target) return false;
  const current = findMockRoutine(input.id);
  const position = current && current.project.id === input.projectId ? current.routine.position : nextPosition(target.routines.map((r) => r.position));
  const saved: ProjectRoutine = {
    id: input.id,
    name: input.name.trim(),
    position,
    weekdays: input.weekdays,
    exercises: input.exercises,
    averageDurationSeconds: current?.routine.averageDurationSeconds ?? null,
  };
  store = store.map((p) => {
    const others = p.routines.filter((r) => r.id !== input.id);
    if (p.id !== input.projectId) return { ...p, routines: others };
    return { ...p, routines: [...others, saved].sort((a, b) => a.position - b.position) };
  });
  return true;
}
