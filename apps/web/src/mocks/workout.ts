/**
 * MOCK do treino em andamento e da biblioteca de exercícios — mesmo contrato de @guf/api
 * (WorkoutApi): mesmos nomes, parâmetros e retorno (incluindo erros).
 *
 * Guarda tudo em memória (como um "banco" local): as escritas alteram os dados e o
 * resumo de finishWorkout sai deles, como fará o finish_workout real.
 * Para integrar o Supabase: implementar as funções em packages/api/src/workout.ts e
 * trocar `from "@/mocks/workout"` por `from "@guf/api"`.
 */
import {
  markLoadRecords,
  sessionTotals,
  workoutElapsedSeconds,
  type SetType,
} from "@guf/core";
import {
  apiError,
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
const BEST_KG: Record<string, number> = {
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
  isCompleted,
  previous: prev ? { weightKg: prev[0], reps: prev[1] } : null,
});

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
    bestKg: BEST_KG[name] ?? null,
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
    pausedAt: null,
    pausedSeconds: 0,
    note: null,
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

function newWorkoutExercise(ex: LibraryExercise, setCount = 3): WorkoutExercise {
  return {
    id: nextId("se"),
    exerciseId: ex.id,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipment: ex.equipment,
    restSeconds: 60,
    note: null,
    bestKg: BEST_KG[ex.name] ?? null,
    sets: Array.from({ length: setCount }, (_, i) => ({
      id: nextId("set"),
      setNumber: i + 1,
      setType: "normal" as const,
      weightKg: null,
      reps: 10,
      isCompleted: false,
      previous: null,
    })),
  };
}

/* ---------------- Contrato ---------------- */

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

export const createExercise: WorkoutApi["createExercise"] = async (client, { name, muscleGroup, equipment }) => {
  ignoreClient(client);
  await wait();
  const ex: LibraryExercise = { id: nextId("ex-custom"), name: name.trim(), muscleGroup, equipment, isCustom: true };
  library.push(ex);
  return { data: clone(ex), error: null };
};

export const addWorkoutExercises: WorkoutApi["addWorkoutExercises"] = async (client, { sessionId, exerciseIds }) => {
  ignoreClient(client);
  await wait();
  const workout = session(sessionId);
  const added = exerciseIds
    .map((id) => library.find((e) => e.id === id))
    .filter((e): e is LibraryExercise => Boolean(e))
    .map((e) => newWorkoutExercise(e));
  workout.exercises.push(...added);
  return { data: clone(added), error: null };
};

export const replaceWorkoutExercise: WorkoutApi["replaceWorkoutExercise"] = async (
  client,
  { sessionId, sessionExerciseId, exerciseId },
) => {
  ignoreClient(client);
  await wait();
  const workout = session(sessionId);
  const index = workout.exercises.findIndex((e) => e.id === sessionExerciseId);
  const ex = library.find((e) => e.id === exerciseId);
  const old = workout.exercises[index];
  if (index === -1 || !ex || !old) return { data: null, error: apiError("unknown") };
  const replacement = newWorkoutExercise(ex, old.sets.length);
  replacement.sets = replacement.sets.map((s, i) => ({ ...s, setType: old.sets[i]?.setType ?? "normal", reps: old.sets[i]?.reps ?? 10 }));
  workout.exercises[index] = replacement;
  return { data: clone(replacement), error: null };
};

export const removeWorkoutExercise: WorkoutApi["removeWorkoutExercise"] = async (client, { sessionExerciseId }) => {
  ignoreClient(client);
  await wait();
  const found = findExercise(sessionExerciseId);
  if (found) found.workout.exercises = found.workout.exercises.filter((e) => e.id !== sessionExerciseId);
  return { data: null, error: null };
};

export const saveSet: WorkoutApi["saveSet"] = async (client, { sessionExerciseId, setId, set }) => {
  ignoreClient(client);
  await wait();
  const found = findExercise(sessionExerciseId);
  if (!found) return { data: null, error: apiError("unknown") };
  const existing = setId ? found.exercise.sets.find((s) => s.id === setId) : undefined;
  if (existing) {
    Object.assign(existing, set);
    return { data: clone(existing), error: null };
  }
  const created: WorkoutSet = { id: setId ?? nextId("set"), previous: null, ...set };
  found.exercise.sets.push(created);
  return { data: clone(created), error: null };
};

export const deleteSet: WorkoutApi["deleteSet"] = async (client, { setId }) => {
  ignoreClient(client);
  await wait();
  for (const workout of sessions.values()) {
    for (const exercise of workout.exercises) exercise.sets = exercise.sets.filter((s) => s.id !== setId);
  }
  return { data: null, error: null };
};

export const saveExerciseNote: WorkoutApi["saveExerciseNote"] = async (client, { sessionExerciseId, note }) => {
  ignoreClient(client);
  await wait();
  const found = findExercise(sessionExerciseId);
  if (found) found.exercise.note = note || null;
  return { data: null, error: null };
};

export const saveWorkoutNote: WorkoutApi["saveWorkoutNote"] = async (client, { sessionId, note }) => {
  ignoreClient(client);
  await wait();
  session(sessionId).note = note || null;
  return { data: null, error: null };
};

export const setWorkoutPaused: WorkoutApi["setWorkoutPaused"] = async (client, { sessionId, pausedAt, pausedSeconds }) => {
  ignoreClient(client);
  const workout = session(sessionId);
  workout.pausedAt = pausedAt;
  workout.pausedSeconds = pausedSeconds;
  return { data: null, error: null };
};

export const finishWorkout: WorkoutApi["finishWorkout"] = async (client, { sessionId }) => {
  ignoreClient(client);
  await wait();
  const workout = session(sessionId);
  const sets = workout.exercises.flatMap((e) => e.sets);
  const totals = sessionTotals(sets);
  const personalRecords = workout.exercises.flatMap((e) => {
    const flags = markLoadRecords(e.sets, e.bestKg);
    return e.sets
      .filter((_, i) => flags[i])
      .map((s) => ({ exerciseName: e.name, weightKg: s.weightKg ?? 0, reps: s.reps ?? 0 }));
  });
  const durationSeconds = workoutElapsedSeconds(workout);
  sessions.delete(sessionId);
  return { data: { durationSeconds, volumeKg: totals.volumeKg, setCount: totals.setCount, personalRecords }, error: null };
};

export const discardWorkout: WorkoutApi["discardWorkout"] = async (client, { sessionId }) => {
  ignoreClient(client);
  await wait();
  sessions.delete(sessionId);
  return { data: null, error: null };
};

/** Garante em tempo de compilação que o mock segue o contrato completo. */
export const mockWorkoutApi = {
  getWorkout,
  getExerciseLibrary,
  createExercise,
  addWorkoutExercises,
  replaceWorkoutExercise,
  removeWorkoutExercise,
  saveSet,
  deleteSet,
  saveExerciseNote,
  saveWorkoutNote,
  setWorkoutPaused,
  finishWorkout,
  discardWorkout,
} satisfies WorkoutApi;
