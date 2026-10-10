/**
 * MOCK dos dados da tela Início — mesmo contrato de @guf/api (HomeApi):
 * mesmos nomes, parâmetros e formato de retorno (incluindo os erros).
 *
 * Para integrar o Supabase: implementar getHomeSummary/startWorkout em packages/api
 * e trocar `from "@/mocks/home"` por `from "@guf/api"`.
 *
 * Cenários (só em desenvolvimento, via ?estado= — ver useDevHomeState):
 * - Treino de hoje: planejado (padrão) · vazio · novo · concluido
 * - Sequência: ativa (padrão) · recorde · risco · zerada
 */
import type {
  FinishedSession,
  GufClient,
  HomeApi,
  HomeSummary,
  RoutineSummary,
} from "@guf/api";

export type TodayScenario = "planejado" | "vazio" | "novo" | "concluido";
export type StreakScenario = "ativa" | "recorde" | "risco" | "zerada";

export interface HomeMockScenario {
  today: TodayScenario;
  streak: StreakScenario;
}

export const DEFAULT_HOME_SCENARIO: HomeMockScenario = { today: "planejado", streak: "ativa" };

let scenario: HomeMockScenario = DEFAULT_HOME_SCENARIO;

/** Define o cenário do mock (usado apenas em desenvolvimento). */
export function setHomeMockScenario(next: HomeMockScenario) {
  scenario = next;
}

const LATENCY_MS = 600;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

function ignoreClient(client: GufClient) {
  void client;
}

const PROJECT = { id: "project-abc", name: "Hipertrofia 2026 – ABC" };

const ROUTINES: RoutineSummary[] = [
  {
    id: "routine-a",
    name: "Treino A – Peito e Tríceps",
    position: 1,
    muscleGroups: ["Peito", "Tríceps", "Ombros"],
    estimatedMinutes: 50,
    exercises: [
      { name: "Supino reto", sets: 4, repsMin: 8, repsMax: 12 },
      { name: "Supino inclinado com halteres", sets: 3, repsMin: 10, repsMax: 10 },
      { name: "Crucifixo", sets: 3, repsMin: 12, repsMax: 12 },
      { name: "Desenvolvimento", sets: 3, repsMin: 8, repsMax: 10 },
      { name: "Tríceps corda", sets: 3, repsMin: 10, repsMax: 12 },
      { name: "Tríceps testa", sets: 3, repsMin: 10, repsMax: 12 },
    ],
  },
  {
    id: "routine-b",
    name: "Treino B – Costas e Bíceps",
    position: 2,
    muscleGroups: ["Costas", "Bíceps", "Antebraço"],
    estimatedMinutes: 55,
    exercises: [
      { name: "Puxada frontal", sets: 3, repsMin: 8, repsMax: 12 },
      { name: "Remada curvada com barra", sets: 3, repsMin: 8, repsMax: 10 },
      { name: "Rosca direta", sets: 3, repsMin: 10, repsMax: 12 },
      { name: "Remada baixa", sets: 3, repsMin: 10, repsMax: 12 },
      { name: "Rosca martelo", sets: 3, repsMin: 10, repsMax: 12 },
      { name: "Rosca inversa", sets: 3, repsMin: 12, repsMax: 15 },
    ],
  },
  {
    id: "routine-c",
    name: "Treino C – Pernas e Ombros",
    position: 3,
    muscleGroups: ["Pernas", "Ombros"],
    estimatedMinutes: 65,
    exercises: [
      { name: "Agachamento livre", sets: 4, repsMin: 6, repsMax: 10 },
      { name: "Leg press", sets: 3, repsMin: 10, repsMax: 12 },
      { name: "Cadeira extensora", sets: 3, repsMin: 12, repsMax: 15 },
      { name: "Mesa flexora", sets: 3, repsMin: 10, repsMax: 12 },
      { name: "Panturrilha em pé", sets: 4, repsMin: 12, repsMax: 15 },
      { name: "Elevação lateral", sets: 3, repsMin: 12, repsMax: 15 },
      { name: "Desenvolvimento militar", sets: 3, repsMin: 8, repsMax: 10 },
    ],
  },
];

/** Treinos fictícios da semana: dia (0 = segunda) → rotina e números. */
const WEEK_PLAN: Array<{ dayIndex: number; routine: number; duration: number; volume: number; sets: number }> = [
  { dayIndex: 0, routine: 0, duration: 3160, volume: 8120, sets: 18 },
  { dayIndex: 2, routine: 1, duration: 3310, volume: 9410, sets: 18 },
  { dayIndex: 3, routine: 2, duration: 3665, volume: 12480, sets: 21 },
];

function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function session(id: string, routine: RoutineSummary, performedOn: string, duration: number, volume: number, sets: number): FinishedSession {
  return { id, routineId: routine.id, name: routine.name, performedOn, durationSeconds: duration, volumeKg: volume, setCount: sets };
}

export const getHomeSummary: HomeApi["getHomeSummary"] = async (client, { today, weekStart }) => {
  ignoreClient(client);
  await wait();
  const { today: todayScenario, streak: streakScenario } = scenario;

  // Treinos dos dias anteriores a hoje nesta semana (nunca no futuro).
  const pastSessions: FinishedSession[] =
    streakScenario === "risco" || streakScenario === "zerada" || todayScenario === "novo"
      ? []
      : WEEK_PLAN.map((p) => ({ ...p, iso: addDaysISO(weekStart, p.dayIndex) }))
          .filter((p) => p.iso < today)
          .map((p) => session(`session-${p.dayIndex}`, ROUTINES[p.routine]!, p.iso, p.duration, p.volume, p.sets));

  const todaySessions =
    todayScenario === "concluido" ? [session("session-today", ROUTINES[1]!, today, 3492, 9840, 18)] : [];
  const weekSessions = [...pastSessions, ...todaySessions];

  const bestStreak = streakScenario === "zerada" || todayScenario === "novo" ? 0 : 9;
  let currentStreak = streakScenario === "recorde" ? 9 : streakScenario === "zerada" || todayScenario === "novo" ? 0 : 6;
  const weekSecured = weekSessions.length > 0;
  if (weekSecured && currentStreak === 0) currentStreak = 1; // a semana atual já conta

  const hasProject = todayScenario === "planejado" || todayScenario === "concluido";

  const summary: HomeSummary = {
    profile: { name: "Lucas Almeida", weeklyGoal: streakScenario === "zerada" ? 3 : 4 },
    activeProject: hasProject ? { ...PROJECT, routines: ROUTINES } : null,
    hasAnyRoutine: todayScenario !== "novo",
    lastFinishedRoutineId: todayScenario === "novo" ? null : "routine-a",
    weekSessions,
    streak: {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      currentWeekCount: weekSessions.length,
      weekSecured,
      streakAtRisk: !weekSecured && currentStreak > 0,
    },
  };
  return { data: summary, error: null };
};

let sessionCounter = 0;

export const startWorkout: HomeApi["startWorkout"] = async (client, { routineId, performedOn }) => {
  ignoreClient(client);
  void routineId;
  void performedOn;
  await wait();
  sessionCounter += 1;
  return { data: { sessionId: `mock-session-${sessionCounter}` }, error: null };
};

/** Garante em tempo de compilação que o mock segue o contrato completo. */
export const mockHomeApi = { getHomeSummary, startWorkout } satisfies HomeApi;
