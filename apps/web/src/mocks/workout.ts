/**
 * MOCK do treino em andamento e da biblioteca de exercícios — mesmo contrato de @guf/api
 * (WorkoutApi). A tela usa os DADOS REAIS; este mock existe só para o modo de demonstração
 * em DESENVOLVIMENTO (/treino?id=demo&estado=demo), com o treino do design e sem gravar nada.
 */
import { buildExerciseRecord, sessionTotals, workoutElapsedSeconds, type SetType } from "@guf/core";
import {
  apiError,
  DEFAULT_REST_SECONDS,
  type ActiveWorkout,
  type GufClient,
  type LibraryExercise,
  type WorkoutApi,
  type WorkoutExercise,
  type WorkoutSet,
} from "@guf/api";

const LATENCY_MS = 450;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
function ignoreClient(client: GufClient) {
  void client;
}

let failNextLoad = false;
/** Desenvolvimento: faz o próximo getWorkout falhar (cenário ?estado=erro). */
export function setWorkoutMockFailure(fail: boolean) {
  failNextLoad = fail;
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

/* ---------------- Biblioteca (globais) ---------------- */

const LIB: Array<[string, string, string]> = [
  ["Supino reto", "peito", "barra"],
  ["Supino inclinado", "peito", "halter"],
  ["Supino declinado", "peito", "barra"],
  ["Crucifixo", "peito", "halter"],
  ["Crossover", "peito", "polia"],
  ["Peck deck", "peito", "maquina"],
  ["Flexão de braço", "peito", "peso_corporal"],
  ["Puxada frontal", "costas", "polia"],
  ["Remada curvada", "costas", "barra"],
  ["Remada baixa", "costas", "polia"],
  ["Remada unilateral", "costas", "halter"],
  ["Barra fixa", "costas", "peso_corporal"],
  ["Pulldown", "costas", "polia"],
  ["Levantamento terra", "costas", "barra"],
  ["Desenvolvimento", "ombros", "halter"],
  ["Desenvolvimento militar", "ombros", "barra"],
  ["Elevação lateral", "ombros", "halter"],
  ["Elevação frontal", "ombros", "halter"],
  ["Crucifixo inverso", "ombros", "maquina"],
  ["Encolhimento", "ombros", "halter"],
  ["Rosca direta", "biceps", "barra"],
  ["Rosca alternada", "biceps", "halter"],
  ["Rosca martelo", "biceps", "halter"],
  ["Rosca Scott", "biceps", "maquina"],
  ["Rosca na polia", "biceps", "polia"],
  ["Tríceps corda", "triceps", "polia"],
  ["Tríceps testa", "triceps", "barra"],
  ["Tríceps francês", "triceps", "halter"],
  ["Paralelas", "triceps", "peso_corporal"],
  ["Tríceps banco", "triceps", "peso_corporal"],
  ["Rosca de punho", "antebraco", "barra"],
  ["Rosca inversa", "antebraco", "barra"],
  ["Caminhada do fazendeiro", "antebraco", "halter"],
  ["Agachamento livre", "quadriceps", "barra"],
  ["Leg press 45°", "quadriceps", "maquina"],
  ["Cadeira extensora", "quadriceps", "maquina"],
  ["Agachamento no Smith", "quadriceps", "smith"],
  ["Afundo", "quadriceps", "halter"],
  ["Agachamento búlgaro", "quadriceps", "halter"],
  ["Mesa flexora", "posterior", "maquina"],
  ["Cadeira flexora", "posterior", "maquina"],
  ["Stiff", "posterior", "barra"],
  ["Bom dia", "posterior", "barra"],
  ["Elevação pélvica", "gluteos", "barra"],
  ["Glúteo na polia", "gluteos", "polia"],
  ["Cadeira abdutora", "gluteos", "maquina"],
  ["Ponte com elástico", "gluteos", "elastico"],
  ["Panturrilha em pé", "panturrilha", "maquina"],
  ["Panturrilha sentado", "panturrilha", "maquina"],
  ["Panturrilha no leg press", "panturrilha", "maquina"],
  ["Abdominal supra", "abdomen", "peso_corporal"],
  ["Prancha", "abdomen", "peso_corporal"],
  ["Abdominal na polia", "abdomen", "polia"],
  ["Elevação de pernas", "abdomen", "peso_corporal"],
  ["Kettlebell swing", "corpo_inteiro", "kettlebell"],
  ["Burpee", "corpo_inteiro", "peso_corporal"],
  ["Power clean", "corpo_inteiro", "barra"],
  ["Thruster", "corpo_inteiro", "halter"],
  ["Esteira", "cardio", "maquina"],
  ["Bicicleta", "cardio", "maquina"],
  ["Remo ergômetro", "cardio", "maquina"],
  ["Pular corda", "cardio", "outro"],
];

const library: LibraryExercise[] = LIB.map(([name, muscleGroup, equipment], i) => ({
  id: `ex-${i + 1}`,
  name,
  muscleGroup,
  equipment,
  isCustom: false,
}));

const byName = (name: string) => library.find((e) => e.name === name)!;

/** Melhor carga histórica fictícia (null = nunca fez → não gera PR). */
const BEST_1RM_KG: Record<string, number> = {
  "Puxada frontal": 62.5,
  "Remada curvada": 70,
  "Remada baixa": 65,
  "Rosca direta": 35,
  "Rosca martelo": 16,
  "Rosca de punho": 25,
};

/* ---------------- Treino de exemplo (o do design) ---------------- */

type SeedSet = [SetType, [number | null, number | null] | null, number | null, number | null, boolean];
const seedSet = ([setType, prev, weightKg, reps, isCompleted]: SeedSet, i: number): WorkoutSet => ({
  id: nextId("set"),
  setNumber: i + 1,
  setType,
  weightKg,
  reps,
  distanceKm: null,
  durationSeconds: null,
  isCompleted,
  previous: prev ? { weightKg: prev[0], reps: prev[1], distanceKm: null, durationSeconds: null } : null,
});

/** [distância km, tempo s] anterior, distância, tempo, concluída. */
type SeedCardioSet = [[number, number] | null, number | null, number | null, boolean];
const seedCardioSet = ([prev, distanceKm, durationSeconds, isCompleted]: SeedCardioSet, i: number): WorkoutSet => ({
  id: nextId("set"),
  setNumber: i + 1,
  setType: "normal",
  weightKg: null,
  reps: null,
  distanceKm,
  durationSeconds,
  isCompleted,
  previous: prev ? { weightKg: null, reps: null, distanceKm: prev[0], durationSeconds: prev[1] } : null,
});

/** Marcas anteriores do cardio na demonstração: 6:00 /km e 5 km (correr mais rápido ou mais longe vira recorde). */
const MOCK_CARDIO_BEST = { secondsPerKm: 360, distanceKm: 5 };

function seedCardioExercise(name: string, restSeconds: number, sets: SeedCardioSet[]): WorkoutExercise {
  const ex = byName(name);
  return {
    id: nextId("se"),
    exerciseId: ex.id,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipment: ex.equipment,
    restSeconds,
    note: null,
    best1RmKg: null,
    cardioBest: MOCK_CARDIO_BEST,
    sets: sets.map(seedCardioSet),
  };
}

function seedExercise(name: string, restSeconds: number, note: string | null, sets: SeedSet[]): WorkoutExercise {
  const ex = byName(name);
  return {
    id: nextId("se"),
    exerciseId: ex.id,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipment: ex.equipment,
    restSeconds,
    note,
    best1RmKg: BEST_1RM_KG[name] ?? null,
    cardioBest: null,
    sets: sets.map(seedSet),
  };
}

function seedWorkout(sessionId: string): ActiveWorkout {
  return {
    id: sessionId,
    name: "Treino B – Costas e Bíceps",
    routineId: "routine-b",
    projectName: "Hipertrofia 2026 – ABC",
    performedOn: new Date().toISOString().slice(0, 10),
    startedAt: new Date(Date.now() - 1934 * 1000).toISOString(),
    activePeriods: [{ startedAt: new Date(Date.now() - 1934 * 1000).toISOString(), endedAt: null }],
    note: null,
    weightUnit: "kg",
    exercises: [
      seedExercise("Puxada frontal", 90, "Pegada aberta, puxar até o queixo", [
        ["warmup", [30, 12], 30, 12, true],
        ["normal", [60, 10], 60, 10, true],
        ["normal", [62.5, 8], 65, 8, false],
        ["normal", [62.5, 7], 65, 8, false],
      ]),
      seedExercise("Remada curvada", 120, null, [
        ["normal", [60, 10], 60, 10, false],
        ["normal", [60, 10], 60, 10, false],
        ["normal", [60, 9], 60, 10, false],
        ["dropset", [40, 12], 40, 12, false],
      ]),
      seedExercise("Remada baixa", 90, null, [
        ["normal", [55, 12], 55, 12, false],
        ["normal", [55, 12], 55, 12, false],
        ["normal", [55, 10], 55, 12, false],
      ]),
      seedExercise("Rosca direta", 60, null, [
        ["normal", [35, 8], 37.5, 8, false],
        ["normal", [30, 10], 30, 10, false],
        ["failure", [25, 8], 25, 8, false],
      ]),
      seedExercise("Rosca martelo", 60, null, [
        ["normal", [14, 12], 14, 12, false],
        ["normal", [14, 10], 14, 12, false],
      ]),
      seedExercise("Rosca de punho", 45, null, [
        ["normal", [20, 15], 20, 15, false],
        ["normal", [20, 15], 20, 15, false],
      ]),
      seedCardioExercise("Esteira", 60, [
        [[3, 1200], 3.5, 1380, false],
        [[1, 300], 1, 300, false],
      ]),
    ],
  };
}

/* ---------------- "Banco" em memória ---------------- */

const sessions = new Map<string, ActiveWorkout>();

function session(sessionId: string): ActiveWorkout {
  let w = sessions.get(sessionId);
  if (!w) {
    w = seedWorkout(sessionId);
    sessions.set(sessionId, w);
  }
  return w;
}

function findExercise(sessionExerciseId: string): { workout: ActiveWorkout; exercise: WorkoutExercise } | null {
  for (const workout of sessions.values()) {
    const exercise = workout.exercises.find((e) => e.id === sessionExerciseId);
    if (exercise) return { workout, exercise };
  }
  return null;
}

const clone = <T>(value: T): T => structuredClone(value);

/* ---------------- Contrato ---------------- */

const ok = { data: null, error: null } as const;

export const getWorkout: WorkoutApi["getWorkout"] = async (client, { sessionId }) => {
  ignoreClient(client);
  await wait();
  if (failNextLoad) {
    failNextLoad = false;
    return { data: null, error: apiError("network_error") };
  }
  return { data: clone(session(sessionId)), error: null };
};

export const getExerciseLibrary: WorkoutApi["getExerciseLibrary"] = async (client) => {
  ignoreClient(client);
  await wait();
  return { data: clone(library), error: null };
};

export const getExerciseContext: WorkoutApi["getExerciseContext"] = async (client, { exerciseIds }) => {
  ignoreClient(client);
  await wait();
  const context: Awaited<ReturnType<WorkoutApi["getExerciseContext"]>>["data"] = {};
  for (const id of exerciseIds) {
    const ex = library.find((e) => e.id === id);
    context[id] = {
      previous: [],
      best1RmKg: ex ? (BEST_1RM_KG[ex.name] ?? null) : null,
      cardioBest: ex?.muscleGroup === "cardio" ? MOCK_CARDIO_BEST : null,
      restSeconds: DEFAULT_REST_SECONDS,
      routineNote: null,
    };
  }
  return { data: context, error: null };
};

export const createExercise: WorkoutApi["createExercise"] = async (client, { id, name, muscleGroup, equipment }) => {
  ignoreClient(client);
  await wait();
  const ex: LibraryExercise = { id, name: name.trim(), muscleGroup, equipment, isCustom: true };
  library.push(ex);
  return { data: clone(ex), error: null };
};

export const addWorkoutExercises: WorkoutApi["addWorkoutExercises"] = async (client) => {
  ignoreClient(client);
  await wait();
  return ok;
};

export const replaceWorkoutExercise: WorkoutApi["replaceWorkoutExercise"] = async (client) => {
  ignoreClient(client);
  await wait();
  return ok;
};

export const removeWorkoutExercise: WorkoutApi["removeWorkoutExercise"] = async (client, { sessionExerciseId }) => {
  ignoreClient(client);
  await wait();
  const found = findExercise(sessionExerciseId);
  if (found) found.workout.exercises = found.workout.exercises.filter((e) => e.id !== sessionExerciseId);
  return ok;
};

export const reorderWorkoutExercises: WorkoutApi["reorderWorkoutExercises"] = async (client, { sessionExerciseIds }) => {
  ignoreClient(client);
  await wait();
  const found = sessionExerciseIds[0] ? findExercise(sessionExerciseIds[0]) : null;
  if (found) {
    const rank = new Map(sessionExerciseIds.map((id, i) => [id, i]));
    found.workout.exercises = [...found.workout.exercises].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
  }
  return ok;
};

export const saveSet: WorkoutApi["saveSet"] = async (client) => {
  ignoreClient(client);
  await wait();
  return ok;
};

export const deleteSet: WorkoutApi["deleteSet"] = async (client) => {
  ignoreClient(client);
  await wait();
  return ok;
};

export const saveExerciseNote: WorkoutApi["saveExerciseNote"] = async (client) => {
  ignoreClient(client);
  await wait();
  return ok;
};

export const saveWorkoutNote: WorkoutApi["saveWorkoutNote"] = async (client) => {
  ignoreClient(client);
  await wait();
  return ok;
};

export const pauseWorkout: WorkoutApi["pauseWorkout"] = async (client) => {
  ignoreClient(client);
  return ok;
};

export const resumeWorkout: WorkoutApi["resumeWorkout"] = async (client) => {
  ignoreClient(client);
  return ok;
};

/** Demonstração: não há rotina gravada para atualizar; só confirma. */
export const updateRoutineFromWorkout: WorkoutApi["updateRoutineFromWorkout"] = async (client) => {
  ignoreClient(client);
  await wait();
  return ok;
};

export const finishWorkout: WorkoutApi["finishWorkout"] = async (client, { sessionId }) => {
  ignoreClient(client);
  await wait();
  const workout = session(sessionId);
  const totals = sessionTotals(workout.exercises.flatMap((e) => e.sets));
  const personalRecords = workout.exercises.flatMap((e) => {
    const built = buildExerciseRecord(e, e.sets);
    return built ? [{ exerciseName: e.name, ...built.record }] : [];
  });
  const clock = { startedAt: workout.startedAt, periods: workout.activePeriods };
  const durationSeconds = workoutElapsedSeconds(clock);
  sessions.delete(sessionId);
  return {
    data: {
      durationSeconds,
      elapsedSeconds: durationSeconds,
      pauseCount: Math.max(0, workout.activePeriods.length - 1),
      volumeKg: totals.volumeKg,
      setCount: totals.setCount,
      personalRecords,
    },
    error: null,
  };
};

export const discardWorkout: WorkoutApi["discardWorkout"] = async (client, { sessionId }) => {
  ignoreClient(client);
  await wait();
  sessions.delete(sessionId);
  return ok;
};

export const getWorkoutStatus: WorkoutApi["getWorkoutStatus"] = async (client, { sessionId }) => {
  ignoreClient(client);
  await wait();
  return { data: { status: sessions.has(sessionId) ? "in_progress" : "missing", autoFinished: false }, error: null };
};

/** Garante em tempo de compilação que o mock segue o contrato completo. */
export const mockWorkoutApi = {
  getWorkoutStatus,
  getWorkout,
  getExerciseLibrary,
  getExerciseContext,
  createExercise,
  addWorkoutExercises,
  replaceWorkoutExercise,
  removeWorkoutExercise,
  reorderWorkoutExercises,
  saveSet,
  deleteSet,
  saveExerciseNote,
  saveWorkoutNote,
  pauseWorkout,
  resumeWorkout,
  finishWorkout,
  updateRoutineFromWorkout,
  discardWorkout,
} satisfies WorkoutApi;

