/**
 * MOCK da tela de Rotina — mesmo contrato de @guf/api (RoutinesApi).
 * Usa a mesma memória do mock de Projetos (cenários via ?estado=, só em desenvolvimento).
 */
import { apiError, type GufClient, type RoutineDraft, type RoutineExerciseDraft, type RoutinesApi } from "@guf/api";
import { findMockRoutine, mockDropsOnSave, saveMockRoutine } from "./projects";

const LATENCY_MS = 450;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

function ignoreClient(client: GufClient) {
  void client;
}

const SAMPLE: Array<Pick<RoutineExerciseDraft, "name" | "muscleGroup" | "equipment" | "targetSets" | "targetReps" | "restSeconds" | "notes">> = [
  { name: "Supino reto com barra", muscleGroup: "peito", equipment: "barra", targetSets: 4, targetReps: "8-12", restSeconds: 90, notes: "" },
  { name: "Supino inclinado com halteres", muscleGroup: "peito", equipment: "halter", targetSets: 3, targetReps: "10", restSeconds: 90, notes: "" },
  { name: "Crucifixo com halteres", muscleGroup: "peito", equipment: "halter", targetSets: 3, targetReps: "12", restSeconds: 60, notes: "" },
  { name: "Crossover na polia", muscleGroup: "peito", equipment: "polia", targetSets: 3, targetReps: "12-15", restSeconds: 60, notes: "" },
  { name: "Tríceps na polia com corda", muscleGroup: "triceps", equipment: "polia", targetSets: 3, targetReps: "12", restSeconds: 60, notes: "Cotovelos colados ao corpo" },
  { name: "Tríceps testa com barra W", muscleGroup: "triceps", equipment: "barra", targetSets: 2, targetReps: "falha", restSeconds: 90, notes: "" },
  { name: "Elevação lateral com halteres", muscleGroup: "ombros", equipment: "halter", targetSets: 3, targetReps: "12-15", restSeconds: 45, notes: "" },
];

/** Exercícios detalhados por rotina (o mock de Projetos guarda só o resumo). */
const details = new Map<string, RoutineExerciseDraft[]>();

function exercisesFor(routineId: string, count: number): RoutineExerciseDraft[] {
  const saved = details.get(routineId);
  if (saved) return saved;
  const generated = Array.from({ length: count }, (_, i) => {
    const base = SAMPLE[i % SAMPLE.length]!;
    return { ...base, id: `${routineId}-ex-${i + 1}`, exerciseId: `mock-ex-${i % SAMPLE.length}` };
  });
  details.set(routineId, generated);
  return generated;
}

export const mockRoutinesApi = {
  async getRoutine(client, { routineId }) {
    ignoreClient(client);
    await wait();
    const found = findMockRoutine(routineId);
    if (!found) return { data: null, error: apiError("routine_not_found") };
    const draft: RoutineDraft = {
      id: found.routine.id,
      projectId: found.project.id,
      name: found.routine.name,
      weekdays: [...found.routine.weekdays],
      exercises: structuredClone(exercisesFor(found.routine.id, found.routine.exercises.length)),
    };
    return { data: draft, error: null };
  },
  async saveRoutine(client, draft) {
    ignoreClient(client);
    await wait();
    if (mockDropsOnSave()) return { data: null, error: apiError("network_error") };
    if (draft.exercises.length === 0) return { data: null, error: apiError("routine_empty") };
    const id = draft.id ?? `r-${crypto.randomUUID().slice(0, 8)}`;
    const ok = saveMockRoutine({
      id,
      projectId: draft.projectId,
      name: draft.name,
      weekdays: draft.weekdays,
      exercises: draft.exercises.map((e) => ({ targetSets: e.targetSets, restSeconds: e.restSeconds })),
    });
    if (!ok) return { data: null, error: apiError("project_not_found") };
    details.set(id, structuredClone(draft.exercises));
    return { data: { id }, error: null };
  },
} satisfies RoutinesApi;
