/**
 * MOCK do Resumo do treino e da Evolução por exercício — mesmo contrato de @guf/api (EvolutionApi).
 *
 * As telas usam os DADOS REAIS (packages/api). Este mock existe só para visualizar os estados do design
 * em DESENVOLVIMENTO, via ?estado= (ver useDevEvolutionState):
 * resumo: padrao · sem-recordes · livre · pausas · nao-encontrado · erro
 * evolução: padrao · primeira-vez · um-treino · erro
 * Sem ?id= (ou id desconhecido), cada cenário escolhe um treino/exercício de exemplo.
 * "Excluir" só tira o treino da memória do mock — nunca apaga nada de verdade.
 */
import {
  apiError,
  type EvolutionApi,
  type ExerciseEvolution,
  type GufClient,
  type SummaryExercise,
  type TrainedExercise,
  type WorkoutSummaryDetail,
  type WorkoutSummaryRecord,
} from "@guf/api";
import {
  addLocalDays,
  best1RMSet,
  bestLoadSet,
  estimate1RM,
  recordSetIndex,
  sessionLoadRecord,
  sessionTotals,
  toLocalISODate,
  weekStart,
  withRecords,
  type ExerciseSessionBest,
  type SetType,
} from "@guf/core";

export type EvolutionMockScenario = "padrao" | "sem-recordes" | "livre" | "pausas" | "nao-encontrado" | "primeira-vez" | "um-treino" | "erro";

let scenario: EvolutionMockScenario = "padrao";
const deleted: string[] = [];

/** Define o cenário do mock (usado apenas em desenvolvimento). */
export function setEvolutionMockScenario(next: EvolutionMockScenario) {
  scenario = next;
}

const LATENCY_MS = 500;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

function ignoreClient(client: GufClient) {
  void client;
}

/* ---------------------------------------------------------------------
 * Dados fictícios (determinísticos, relativos a hoje)
 * --------------------------------------------------------------------- */

interface MockExercise {
  id: string;
  name: string;
  group: string;
  equipment: string;
  /** Carga de topo atual, reps, passo e nº de séries de trabalho. */
  top: number;
  reps: number;
  step: number;
  sets: number;
  warmup?: boolean;
  /** O último treino bate o recorde de carga. */
  record?: boolean;
}

const EXERCISES: MockExercise[] = [
  { id: "mock-supino", name: "Supino reto", group: "peito", equipment: "barra", top: 82.5, reps: 8, step: 2.5, sets: 4, warmup: true, record: true },
  { id: "mock-crucifixo", name: "Crucifixo inclinado", group: "peito", equipment: "halter", top: 18, reps: 12, step: 1, sets: 3 },
  { id: "mock-triceps-corda", name: "Tríceps corda", group: "triceps", equipment: "polia", top: 30, reps: 12, step: 2.5, sets: 3 },
  { id: "mock-puxada", name: "Puxada frontal", group: "costas", equipment: "polia", top: 65, reps: 8, step: 2.5, sets: 3, warmup: true, record: true },
  { id: "mock-remada", name: "Remada curvada", group: "costas", equipment: "barra", top: 60, reps: 10, step: 2.5, sets: 3, warmup: true },
  { id: "mock-rosca", name: "Rosca direta", group: "biceps", equipment: "barra", top: 37.5, reps: 8, step: 2.5, sets: 3, record: true },
  { id: "mock-face-pull", name: "Face pull", group: "ombros", equipment: "polia", top: 20, reps: 15, step: 2.5, sets: 2 },
  { id: "mock-agachamento", name: "Agachamento livre", group: "quadriceps", equipment: "barra", top: 100, reps: 6, step: 2.5, sets: 4, warmup: true },
  { id: "mock-leg-press", name: "Leg press 45°", group: "quadriceps", equipment: "maquina", top: 220, reps: 10, step: 10, sets: 3 },
  { id: "mock-desenvolvimento", name: "Desenvolvimento", group: "ombros", equipment: "halter", top: 24, reps: 10, step: 2, sets: 3 },
  { id: "mock-flexora", name: "Cadeira flexora", group: "posterior", equipment: "maquina", top: 45, reps: 12, step: 5, sets: 3 },
  { id: "mock-panturrilha", name: "Panturrilha em pé", group: "panturrilha", equipment: "maquina", top: 80, reps: 15, step: 5, sets: 3 },
  { id: "mock-pullover", name: "Pullover na polia", group: "costas", equipment: "polia", top: 25, reps: 12, step: 2.5, sets: 3 },
];
/* Sem código no carregamento do módulo: assim o build de produção descarta o mock inteiro. */
const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id);

const ROUTINES = {
  A: { name: "Treino A – Peito e Tríceps", weekday: 0, hour: 7, exercises: ["mock-supino", "mock-crucifixo", "mock-triceps-corda"] },
  C: { name: "Treino C – Pernas e Ombros", weekday: 2, hour: 19, exercises: ["mock-agachamento", "mock-leg-press", "mock-desenvolvimento"] },
  B: { name: "Treino B – Costas e Bíceps", weekday: 3, hour: 18, exercises: ["mock-puxada", "mock-remada", "mock-rosca", "mock-face-pull"] },
  L: { name: "Treino de sábado", weekday: 5, hour: 9, exercises: ["mock-panturrilha"], free: true },
} as const;
type RoutineKey = keyof typeof ROUTINES;

const WEEKS = 60;
const GAPS = [7, 20, 21, 33, 34, 52];
const PROJECT = "Hipertrofia 2026 – ABC";

interface MockSet {
  setType: SetType;
  weightKg: number;
  reps: number;
}

interface MockSession {
  id: string;
  key: RoutineKey;
  name: string;
  performedOn: string;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  exercises: Array<{ exercise: MockExercise; sets: MockSet[] }>;
}

function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Séries de um exercício na semana `weeksAgo` (progressão lenta; a última semana bate o recorde). */
function setsFor(e: MockExercise, weeksAgo: number): MockSet[] {
  const rnd = random(e.id.length * 7919 + weeksAgo * 31);
  const progress = 1 - weeksAgo / WEEKS;
  const round = (v: number) => Math.max(e.step, Math.round(v / e.step) * e.step);
  let top = round(e.top * (0.7 + 0.3 * progress ** 0.85));
  top = Math.min(top, e.record && weeksAgo > 0 ? e.top - e.step : e.top);
  if (!e.record && weeksAgo === 0) top = Math.min(top, e.top - e.step);
  const reps = e.reps + (rnd() < 0.3 ? 1 : 0) - (rnd() < 0.2 ? 1 : 0);
  const out: MockSet[] = [];
  if (e.warmup) out.push({ setType: "warmup", weightKg: round(top * 0.5), reps: 12 });
  for (let i = e.sets - 1; i >= 0; i--) out.push({ setType: "normal", weightKg: round(top - i * e.step), reps: reps + i });
  if (e.id === "mock-remada" && weeksAgo === 0) out.push({ setType: "dropset", weightKg: round(top * 0.7), reps: 8 });
  return out;
}

function buildSessions(): MockSession[] {
  const today = new Date();
  const monday = weekStart(today);
  const sessions: MockSession[] = [];
  for (let w = WEEKS; w >= 0; w--) {
    if (GAPS.includes(w)) continue;
    (Object.keys(ROUTINES) as RoutineKey[]).forEach((key) => {
      const r = ROUTINES[key];
      if (key === "L" && w % 2 !== 0) return;
      const day = addLocalDays(monday, -w * 7 + r.weekday);
      if (day > today) return;
      const rnd = random(w * 131 + key.charCodeAt(0));
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), r.hour, Math.floor(rnd() * 55));
      const duration = key === "B" && w === 0 ? 3492 : Math.round(((key === "L" ? 28 : 44) + rnd() * 18) * 60);
      // Cadeira flexora: só uma vez (estado "um treino").
      const ids = [...r.exercises, ...(key === "C" && w === 1 ? ["mock-flexora"] : [])];
      sessions.push({
        id: `mock-${key}${w}`,
        key,
        name: r.name,
        performedOn: toLocalISODate(day),
        startedAt: start.toISOString(),
        finishedAt: new Date(start.getTime() + (duration + 120) * 1000).toISOString(),
        durationSeconds: duration,
        exercises: ids.map((id) => {
          const exercise = exerciseById(id)!;
          return { exercise, sets: setsFor(exercise, w) };
        }),
      });
    });
  }
  // Dois treinos no mesmo dia (resumo "1/2" e "2/2"): treino livre depois do último Treino B.
  const lastB = sessions.filter((x) => x.key === "B").at(-1);
  if (lastB) {
    const start = new Date(new Date(lastB.finishedAt).getTime() + 2 * 3600 * 1000);
    const panturrilha = exerciseById("mock-panturrilha")!;
    sessions.push({
      id: "mock-extra",
      key: "L",
      name: "Treino livre",
      performedOn: lastB.performedOn,
      startedAt: start.toISOString(),
      finishedAt: new Date(start.getTime() + 25 * 60 * 1000).toISOString(),
      durationSeconds: 24 * 60,
      exercises: [{ exercise: panturrilha, sets: setsFor(panturrilha, 1) }],
    });
  }
  return sessions;
}

/** Treinos do mesmo dia, do primeiro ao último a terminar. */
function sameDayIds(s: MockSession): string[] {
  return liveSessions()
    .filter((x) => x.performedOn === s.performedOn)
    .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))
    .map((x) => x.id);
}

let sessionsCache: MockSession[] | null = null;
const allSessions = () => (sessionsCache ??= buildSessions());

function liveSessions(): MockSession[] {
  return allSessions().filter((s) => !deleted.includes(s.id));
}

/** Melhor carga por treino de um exercício (como get_exercise_history), sem os excluídos. */
function historyOf(exerciseId: string): ExerciseSessionBest[] {
  return liveSessions().flatMap((s) => {
    const e = s.exercises.find((x) => x.exercise.id === exerciseId);
    const best = e ? bestLoadSet(e.sets) : null;
    return best ? [{ sessionId: s.id, performedOn: s.performedOn, maxWeightKg: best.weightKg }] : [];
  });
}

/** Treino de exemplo de cada cenário (o mais recente da rotina). */
function defaultSessionId(): string {
  const key: RoutineKey = scenario === "sem-recordes" ? "C" : scenario === "livre" ? "L" : "B";
  return liveSessions().filter((s) => s.key === key).at(-1)?.id ?? "";
}

function defaultExerciseId(): string {
  return scenario === "primeira-vez" ? "mock-pullover" : scenario === "um-treino" ? "mock-flexora" : "mock-supino";
}

function toSummary(s: MockSession): WorkoutSummaryDetail {
  const dayIds = sameDayIds(s);
  const earlierSameDay = new Set(dayIds.slice(0, dayIds.indexOf(s.id)));
  const free = s.key === "L";
  const records: WorkoutSummaryRecord[] = [];
  const exercises = s.exercises.map<SummaryExercise>(({ exercise, sets }, i) => {
    const recordKg = sessionLoadRecord(historyOf(exercise.id), s.id, s.performedOn, earlierSameDay);
    const recordIndex = recordSetIndex(sets, recordKg);
    if (recordKg !== null) records.push({ exerciseId: exercise.id, exerciseName: exercise.name, weightKg: recordKg, reps: sets[recordIndex ?? -1]?.reps ?? null });
    const totals = sessionTotals(sets.map((x) => ({ ...x, isCompleted: true })));
    return {
      id: `${s.id}-${i}`,
      exerciseId: exercise.id,
      name: exercise.name,
      muscleGroup: exercise.group,
      note: s.key === "B" && exercise.id === "mock-puxada" ? "Pegada aberta, segurar 1 s embaixo." : null,
      sets: sets.map((x, n) => ({ setNumber: n + 1, ...x, isRecord: n === recordIndex })),
      setCount: totals.setCount,
      volumeKg: totals.volumeKg,
    };
  });
  const totals = sessionTotals(s.exercises.flatMap((e) => e.sets.map((x) => ({ ...x, isCompleted: true }))));
  const pauses = scenario === "pausas";
  return {
    id: s.id,
    name: s.name,
    projectName: free ? null : PROJECT,
    routineId: free ? null : `routine-${s.key}`,
    performedOn: s.performedOn,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    durationSeconds: s.durationSeconds,
    pauseCount: pauses ? 2 : 0,
    pausedSeconds: pauses ? 390 : 0,
    volumeKg: totals.volumeKg,
    setCount: totals.setCount,
    exercises,
    records,
    daySessionIds: dayIds,
    weightUnit: "kg",
  };
}

export const mockEvolutionApi = {
  async getWorkoutSummary(client, { sessionId }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("unknown") };
    if (scenario === "nao-encontrado") return { data: null, error: apiError("session_not_found") };
    const id = allSessions().some((s) => s.id === sessionId) ? sessionId : defaultSessionId();
    const session = liveSessions().find((s) => s.id === id);
    return session ? { data: toSummary(session), error: null } : { data: null, error: apiError("session_not_found") };
  },
  async deleteWorkout(client, { sessionId }) {
    ignoreClient(client);
    await wait();
    if (!liveSessions().some((s) => s.id === sessionId)) return { data: null, error: apiError("session_not_found") };
    deleted.push(sessionId);
    return { data: null, error: null };
  },
  async getExerciseEvolution(client, { exerciseId }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("unknown") };
    const exercise = exerciseById(exerciseId) ?? exerciseById(defaultExerciseId());
    if (!exercise) return { data: null, error: apiError("exercise_not_found") };
    const sessions = liveSessions().flatMap((s) => {
      const e = s.exercises.find((x) => x.exercise.id === exercise.id);
      if (!e) return [];
      const best = bestLoadSet(e.sets);
      const oneRm = best1RMSet(e.sets);
      const totals = sessionTotals(e.sets.map((x) => ({ ...x, isCompleted: true })));
      if (!best) return [];
      return [
        {
          sessionId: s.id,
          performedOn: s.performedOn,
          finishedAt: s.finishedAt,
          sessionName: s.name,
          maxWeightKg: best.weightKg,
          repsAtMax: best.reps,
          best1RMKg: oneRm ? estimate1RM(oneRm.weightKg, oneRm.reps) : null,
          best1RMSet: oneRm ? { weightKg: oneRm.weightKg, reps: oneRm.reps } : null,
          volumeKg: totals.volumeKg,
          setCount: totals.setCount,
        },
      ];
    });
    const data: ExerciseEvolution = {
      exercise: { id: exercise.id, name: exercise.name, muscleGroup: exercise.group, equipment: exercise.equipment },
      weightUnit: "kg",
      sessions: withRecords(sessions),
    };
    return { data, error: null };
  },
  async listTrainedExercises(client) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("unknown") };
    const last = new Map<string, TrainedExercise>();
    for (const s of liveSessions()) {
      for (const { exercise } of s.exercises) {
        last.set(exercise.id, { exerciseId: exercise.id, name: exercise.name, muscleGroup: exercise.group, lastPerformedOn: s.performedOn });
      }
    }
    return { data: [...last.values()], error: null };
  },
} satisfies EvolutionApi;
