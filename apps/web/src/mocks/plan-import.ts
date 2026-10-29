/**
 * MOCK da importação de ficha — mesmo contrato de @guf/api (PlanImportApi).
 * Só em DESENVOLVIMENTO, com os ?estado= de Projetos (a memória é a do mock de Projetos):
 * qualquer texto vira a mesma ficha de exemplo (exercícios do catálogo + 1 novo);
 * "erro" falha a conversão e "queda" falha a criação como queda de conexão.
 */
import { apiError, type ApiResult, type GufClient, type LibraryExercise, type PlanImportApi, type PlanImportDraft } from "@guf/api";
import { PLAN_IMPORT_DEFAULT_REST_SECONDS } from "@guf/core";
import { findMockRoutine, mockDropsOnSave, mockProjectsApi, saveMockRoutine } from "@/mocks/projects";
import { mockWorkoutApi } from "@/mocks/workout";

const LATENCY_MS = 900;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

let failConversion = false;

export function setPlanImportMockOptions(next: { failConversion: boolean }) {
  failConversion = next.failConversion;
}

type SampleExercise = [catalogName: string | null, sourceName: string, sets: number, reps: string];

const SAMPLE: Array<{ name: string; weekdays: number[]; exercises: SampleExercise[] }> = [
  {
    name: "Treino A – Peito e tríceps",
    weekdays: [1, 4],
    exercises: [
      ["Supino reto", "supino reto", 4, "10"],
      ["Supino inclinado com halteres", "sup. inclinado halter", 3, "8-12"],
      [null, "crucifixo no banco 45 graus", 3, "12"],
    ],
  },
  {
    name: "Treino B – Costas e bíceps",
    weekdays: [2, 5],
    exercises: [
      ["Puxada frontal", "puxada frente", 4, "10"],
      ["Rosca direta", "rosca direta barra W", 3, "10"],
    ],
  },
];

function toSampleExercise([catalogName, sourceName, sets, reps]: SampleExercise, library: LibraryExercise[]) {
  const found = catalogName ? library.find((e) => e.name === catalogName) : undefined;
  return {
    key: crypto.randomUUID(),
    sourceName,
    match: found
      ? { kind: "catalog" as const, exerciseId: found.id, name: found.name, muscleGroup: found.muscleGroup }
      : { kind: "new" as const, name: "Crucifixo inclinado 45°", muscleGroup: "peito" as const, equipment: "halter" as const },
    targetSets: sets,
    targetReps: reps,
    restSeconds: PLAN_IMPORT_DEFAULT_REST_SECONDS,
    notes: "",
  };
}

async function buildSampleDraft(client: GufClient): Promise<PlanImportDraft> {
  const { data: library } = await mockWorkoutApi.getExerciseLibrary(client);
  return {
    projectName: "Ficha do personal",
    routines: SAMPLE.map((routine) => ({
      key: crypto.randomUUID(),
      name: routine.name,
      weekdays: routine.weekdays,
      exercises: routine.exercises.map((e) => toSampleExercise(e, library ?? [])),
    })),
  };
}

async function createMockProject(client: GufClient, draft: PlanImportDraft, activate: boolean): Promise<ApiResult<{ id: string }>> {
  return mockProjectsApi.createProject(client, { name: draft.projectName, description: "", activate });
}

export const mockPlanImportApi = {
  async convertTrainingPlan(client, { text }) {
    await wait();
    if (failConversion) return { data: null, error: apiError("ai_unavailable") };
    if (!text.trim()) return { data: null, error: apiError("plan_import_empty") };
    return { data: await buildSampleDraft(client), error: null };
  },
  async importTrainingPlan(client, { draft, destination }) {
    await wait();
    if (mockDropsOnSave()) return { data: null, error: apiError("network_error") };
    const project = destination.kind === "existing" ? { data: { id: destination.projectId }, error: null } : await createMockProject(client, draft, destination.activate);
    if (project.error) return { data: null, error: project.error };
    for (const routine of draft.routines) {
      const planned = routine.exercises.map((e) => ({ name: e.match.name, muscleGroup: e.match.muscleGroup, targetSets: e.targetSets, targetReps: e.targetReps || null, restSeconds: e.restSeconds }));
      // Rotina existente: os exercícios entram no fim e nome/dias dela continuam (como no banco).
      const into = routine.intoRoutineId ? findMockRoutine(routine.intoRoutineId) : null;
      if (routine.intoRoutineId && (!into || into.project.id !== project.data.id)) return { data: null, error: apiError("routine_not_found") };
      saveMockRoutine(
        into
          ? { id: into.routine.id, projectId: project.data.id, name: into.routine.name, weekdays: into.routine.weekdays, exercises: [...into.routine.exercises, ...planned] }
          : { id: crypto.randomUUID(), projectId: project.data.id, name: routine.name, weekdays: routine.weekdays, exercises: planned },
      );
    }
    return { data: { projectId: project.data.id }, error: null };
  },
} satisfies PlanImportApi;
