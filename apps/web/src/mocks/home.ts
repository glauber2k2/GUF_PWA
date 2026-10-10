/**
 * MOCK dos dados da tela Início — mesmo contrato de @guf/api (HomeApi).
 *
 * A tela usa os DADOS REAIS (packages/api). Este mock existe só para visualizar os
 * estados do design em DESENVOLVIMENTO, via ?estado= (ver useDevHomeState):
 * - Treino de hoje: planejado (padrão) · vazio · novo · concluido · andamento
 * - Sequência: ativa (padrão) · recorde · risco · zerada
 */
import type { FinishedSession, GufClient, HomeApi, HomeSummary, PlannedExercise, RoutineSummary } from "@guf/api";

export type TodayScenario = "planejado" | "vazio" | "novo" | "concluido" | "andamento";
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

const ex = (name: string, muscleGroup: string, targetSets: number, targetReps: string, restSeconds = 90): PlannedExercise => ({
  name,
  muscleGroup,
  targetSets,
  targetReps,
  restSeconds,
});

const PROJECT = { id: "project-abc", name: "Hipertrofia 2026 – ABC" };

const ROUTINES: RoutineSummary[] = [
  {
    id: "routine-a",
    name: "Treino A – Peito e Tríceps",
    position: 1,
    exercises: [
      ex("Supino reto", "peito", 4, "8-12", 120),
      ex("Supino inclinado com halteres", "peito", 3, "10"),
      ex("Crucifixo", "peito", 3, "12", 60),
      ex("Desenvolvimento", "ombros", 3, "8-10"),
      ex("Tríceps corda", "triceps", 3, "10-12", 60),
      ex("Tríceps testa", "triceps", 3, "10-12", 60),
    ],
  },
  {
    id: "routine-b",
    name: "Treino B – Costas e Bíceps",
    position: 2,
    exercises: [
      ex("Puxada frontal", "costas", 3, "8-12"),
      ex("Remada curvada com barra", "costas", 3, "8-10", 120),
      ex("Rosca direta", "biceps", 3, "10-12", 60),
      ex("Remada baixa", "costas", 3, "10-12"),
      ex("Rosca martelo", "biceps", 3, "10-12", 60),
      ex("Rosca inversa", "antebraco", 3, "12-15", 60),
    ],
  },
  {
    id: "routine-c",
    name: "Treino C – Pernas e Ombros",
    position: 3,
    exercises: [
      ex("Agachamento livre", "quadriceps", 4, "6-10", 150),
      ex("Leg press", "quadriceps", 3, "10-12", 120),
      ex("Cadeira extensora", "quadriceps", 3, "12-15", 60),
      ex("Mesa flexora", "posterior", 3, "10-12", 60),
      ex("Panturrilha em pé", "panturrilha", 4, "12-15", 45),
      ex("Elevação lateral", "ombros", 3, "12-15", 45),
      ex("Desenvolvimento militar", "ombros", 3, "8-10"),
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
  const isNew = todayScenario === "novo";

  // Treinos dos dias anteriores a hoje nesta semana (nunca no futuro).
  const pastSessions: FinishedSession[] =
    streakScenario === "risco" || streakScenario === "zerada" || isNew
      ? []
      : WEEK_PLAN.map((p) => ({ ...p, iso: addDaysISO(weekStart, p.dayIndex) }))
          .filter((p) => p.iso < today)
          .map((p) => session(`session-${p.dayIndex}`, ROUTINES[p.routine]!, p.iso, p.duration, p.volume, p.sets));

  const todaySessions =
    todayScenario === "concluido" ? [session("session-today", ROUTINES[1]!, today, 3492, 9840, 18)] : [];
  const weekSessions = [...pastSessions, ...todaySessions];

  const trainingDays = [...new Set(weekSessions.map((s) => s.performedOn))].map((day) => {
    const ofDay = weekSessions.filter((s) => s.performedOn === day);
    return { performedOn: day, sessions: ofDay.length, volumeKg: ofDay.reduce((t, s) => t + s.volumeKg, 0) };
  });

  const bestStreak = streakScenario === "zerada" || isNew ? 0 : 9;
  let currentStreak = streakScenario === "recorde" ? 9 : streakScenario === "zerada" || isNew ? 0 : 6;
  const weekSecured = weekSessions.length > 0;
  if (weekSecured && currentStreak === 0) currentStreak = 1; // a semana atual já conta

  const hasProject = todayScenario === "planejado" || todayScenario === "concluido" || todayScenario === "andamento";
  const startedAt = new Date(Date.now() - 25 * 60_000).toISOString();

  const summary: HomeSummary = {
    profile: { name: "Lucas Almeida", weeklyGoal: streakScenario === "zerada" ? 3 : 4 },
    activeProject: hasProject ? { ...PROJECT, routines: ROUTINES } : null,
    hasAnyRoutine: !isNew,
    lastFinishedRoutineId: isNew ? null : "routine-a",
    trainingDays,
    weekSessions,
    inProgress:
      todayScenario === "andamento"
        ? { id: "session-open", routineId: "routine-b", name: ROUTINES[1]!.name, performedOn: today, startedAt }
        : null,
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
