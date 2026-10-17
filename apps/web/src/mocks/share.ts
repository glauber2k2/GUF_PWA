import { addLocalDays, buildStoryData, fromLocalISODate, toLocalISODate, type StoryInput } from "@guf/core";
import type { ShareApi } from "@guf/api";
import type { GufClient } from "@guf/api";

/*
 * Mock dos stories (mesma assinatura de packages/api/src/share.ts): o treino do design
 * ("Treino A – Peito e Tríceps", 12.480 kg, 2 recordes, 12 semanas de sequência).
 * Tudo é gerado sob demanda (nada no carregamento do módulo), para o build descartar o mock.
 */

const ignoreClient = (client: GufClient) => void client;
const wait = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

type Scenario = "padrao" | "sem-recordes" | "erro" | "novo";
let scenario: Scenario = "padrao";
/** ?estado= da tela que abriu a folha (só desenvolvimento). */
export function setShareMockScenario(value: string | null | undefined) {
  scenario = value === "sem-recordes" || value === "erro" || value === "novo" ? value : "padrao";
}

const set = (weightKg: number | null, reps: number, setType: "normal" | "warmup" = "normal") => ({
  setType,
  weightKg,
  reps,
  completedAt: null as string | null,
});

function sampleInput(today: Date): StoryInput {
  const performedOn = toLocalISODate(today);
  // Séries concluídas a cada ~1:32 (descanso médio do exemplo).
  let clock = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 40).getTime();
  const ex = (name: string, muscleGroup: string, raw: Array<ReturnType<typeof set>>) => {
    const sets = raw.map((s) => ({ ...s, completedAt: new Date((clock += 92_000)).toISOString() }));
    clock += 4 * 60_000;
    const working = sets.filter((s) => s.setType !== "warmup");
    return { name, muscleGroup, sets, setCount: working.length, volumeKg: working.reduce((n, s) => n + (s.weightKg ?? 0) * s.reps, 0) };
  };
  const exercises = [
    ex("Supino reto com barra", "peito", [set(40, 12, "warmup"), set(80, 8), set(80, 8), set(80, 8), set(80, 8)]),
    ex("Supino inclinado", "peito", [set(28, 10), set(28, 10), set(28, 10)]),
    ex("Crucifixo na máquina", "peito", [set(45, 12), set(45, 12), set(45, 12)]),
    ex("Paralelas", "triceps", [set(null, 10), set(null, 10), set(null, 10)]),
    ex("Tríceps na polia", "triceps", [set(30, 12), set(30, 12), set(30, 12), set(30, 12)]),
    ex("Tríceps francês", "triceps", [set(20, 10), set(20, 10), set(20, 10)]),
    ex("Elevação lateral", "ombros", [set(10, 12), set(10, 12)]),
  ];
  const lastMonth = toLocalISODate(addLocalDays(today, -34));
  const records =
    scenario === "sem-recordes" || scenario === "novo"
      ? []
      : [
          { exerciseName: "Supino reto com barra", weightKg: 80, reps: 8, previousWeightKg: 75, previousOn: lastMonth },
          { exerciseName: "Tríceps na polia", weightKg: 30, reps: 12, previousWeightKg: 27.5, previousOn: lastMonth },
        ];
  // 16 semanas: 12 seguidas com treino (as 4 mais antigas sem).
  const trainingDays = Array.from({ length: 16 * 7 }, (_, i) => addLocalDays(today, -i))
    .filter((d, i) => scenario !== "novo" && i < 12 * 7 && d.getDay() % 2 === 1)
    .map((d, i) => ({ performedOn: toLocalISODate(d), sessions: 1, volumeKg: 9000 + ((i * 1370) % 4200) }));
  trainingDays.unshift({ performedOn, sessions: 1, volumeKg: 12480 });
  const groups = ["peito", "costas", "quadriceps", "ombros", "biceps", "triceps", "posterior"];
  const monthSets = trainingDays.map((d, i) => ({
    performedOn: d.performedOn,
    muscleGroup: groups[i % groups.length] ?? "peito",
    sets: 6 + (i % 5),
  }));
  return {
    summary: {
      name: "Treino A – Peito e Tríceps",
      performedOn,
      startedAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 40).toISOString(),
      durationSeconds: 72 * 60,
      volumeKg: exercises.reduce((n, e) => n + e.volumeKg, 0),
      setCount: exercises.reduce((n, e) => n + e.setCount, 0),
      weightUnit: "kg",
      exercises,
      records,
    },
    streak: scenario === "novo" ? { currentStreak: 1, bestStreak: 1 } : { currentStreak: 12, bestStreak: 12 },
    weeklyGoal: 4,
    trainingDays,
    monthSets,
    history: { totalWorkouts: scenario === "novo" ? 1 : 150, firstWorkoutOn: toLocalISODate(addLocalDays(today, scenario === "novo" ? 0 : -220)) },
    featured:
      scenario === "novo"
        ? null
        : {
            exerciseName: "Supino reto com barra",
            points: [70, 72.5, 72.5, 75, 77.5, 80].map((kg, i) => ({
              performedOn: toLocalISODate(addLocalDays(today, -7 * (5 - i) - (i === 5 ? 0 : 1))),
              maxWeightKg: kg,
              e1rmKg: Math.round(kg * (1 + 8 / 30) * 10) / 10,
            })),
          },
    monthActiveSeconds: trainingDays.filter((d) => d.performedOn.slice(0, 7) === performedOn.slice(0, 7)).length * 66 * 60,
    project: scenario === "novo" ? null : { name: "Hipertrofia 2026 – ABC", workouts: 58, volumeKg: 612_400, firstOn: toLocalISODate(addLocalDays(today, -12 * 7 + 3)) },
  };
}

export const getShareStoryData: ShareApi["getShareStoryData"] = async (client) => {
  ignoreClient(client);
  await wait();
  if (scenario === "erro")
    return { data: null, error: { code: "network_error", message: "Sem conexão. Verifique a internet e tente de novo." } };
  return { data: buildStoryData(sampleInput(fromLocalISODate(toLocalISODate(new Date())))), error: null };
};

export const mockShareApi = { getShareStoryData } satisfies ShareApi;

/** Dados de exemplo prontos (vitrine e pré-visualização em desenvolvimento). */
export function mockStoryData() {
  return buildStoryData(sampleInput(new Date()));
}
