/**
 * MOCK da edição de um treino concluído — mesmo contrato de @guf/api (WorkoutEditApi).
 * Só em DESENVOLVIMENTO com ?estado= (o resumo leva o parâmetro junto ao abrir a edição).
 * Lê o treino do mock do Resumo (mesmos cenários) e "salvar" não grava nada.
 */
import { apiError, DEFAULT_REST_SECONDS, type GufClient, type SummaryExercise, type WorkoutEditApi, type WorkoutExercise } from "@guf/api";
import { pickSetValues } from "@guf/core";
import { mockEvolutionApi } from "./evolution";

const LATENCY_MS = 450;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
function ignoreClient(client: GufClient) {
  void client;
}

function toEditableExercise(exercise: SummaryExercise, best1RmKg: number | null): WorkoutExercise {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    name: exercise.name,
    muscleGroup: exercise.muscleGroup,
    equipment: "outro",
    restSeconds: DEFAULT_REST_SECONDS,
    note: exercise.note,
    best1RmKg,
    sets: exercise.sets.map((s, i) => ({
      id: `${exercise.id}-serie-${i + 1}`,
      setNumber: s.setNumber,
      setType: s.setType,
      ...pickSetValues(s),
      isCompleted: true,
      previous: null,
    })),
  };
}

export const mockWorkoutEditApi = {
  async getEditableWorkout(client, { sessionId }) {
    const { data, error } = await mockEvolutionApi.getWorkoutSummary(client, { sessionId });
    if (error) return { data: null, error };
    return {
      data: {
        id: data.id,
        name: data.name,
        performedOn: data.performedOn,
        activeSeconds: data.durationSeconds,
        note: null,
        weightUnit: data.weightUnit,
        exercises: data.exercises.map((e) =>
          toEditableExercise(e, data.records.find((r) => r.exerciseId === e.exerciseId)?.previous1RmKg ?? null),
        ),
      },
      error: null,
    };
  },
  async saveWorkoutEdit(client, { exercises }) {
    ignoreClient(client);
    await wait();
    const hasCompletedSet = exercises.some((e) => e.sets.some((s) => s.isCompleted));
    return hasCompletedSet ? { data: null, error: null } : { data: null, error: apiError("workout_empty") };
  },
} satisfies WorkoutEditApi;
