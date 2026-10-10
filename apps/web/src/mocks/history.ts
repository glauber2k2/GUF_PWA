/**
 * MOCK dos dados do Histórico — mesmo contrato de @guf/api (HistoryApi).
 *
 * A tela usa os DADOS REAIS (packages/api). Este mock existe só para visualizar os estados
 * do design em DESENVOLVIMENTO, via ?estado= (ver useDevHistoryState):
 * padrao · risco · recorde · novo · poucos · erro (+ carregando, offline e dia, que são da tela).
 */
import { apiError, type DaySession, type GufClient, type HistoryApi, type HistoryOverview, type TrainingDay } from "@guf/api";
import { addLocalDays, fromLocalISODate, toLocalISODate, weekStart } from "@guf/core";

export type HistoryMockScenario = "padrao" | "risco" | "recorde" | "novo" | "poucos" | "erro";

let scenario: HistoryMockScenario = "padrao";

/** Define o cenário do mock (usado apenas em desenvolvimento). */
export function setHistoryMockScenario(next: HistoryMockScenario) {
  scenario = next;
}

const LATENCY_MS = 500;
const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

function ignoreClient(client: GufClient) {
  void client;
}

const WEEKS_BACK = 110;
const ROUTINES = [
  { id: "routine-a", name: "Treino A – Peito e Tríceps" },
  { id: "routine-b", name: "Treino B – Costas e Bíceps" },
  { id: "routine-c", name: "Treino C – Pernas e Ombros" },
];
const RECORDS = [
  { exerciseName: "Supino reto", weightKg: 82.5, reps: 8 },
  { exerciseName: "Puxada frontal", weightKg: 65, reps: 8 },
  { exerciseName: "Agachamento livre", weightKg: 100, reps: 6 },
  { exerciseName: "Rosca direta", weightKg: 37.5, reps: 8 },
];
/** Dias da semana treinados (0 = segunda). */
const PATTERNS = [[0, 2, 4], [0, 2, 3, 5], [1, 3, 5], [0, 1, 3, 4], [0, 3], [1, 2, 4, 5]];

/** Gerador determinístico (mesmos dados a cada carregamento). */
function random(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Treinos por dia (data local) do cenário atual, relativos a hoje. */
function buildSessions(): Map<string, DaySession[]> {
  const byDay = new Map<string, DaySession[]>();
  if (scenario === "novo") return byDay;
  const rnd = random(11);
  const gaps = scenario === "recorde" ? [33, 34, 52, 60] : [7, 20, 21, 33, 34, 52, 60];
  const today = new Date();
  const monday = weekStart(today);
  let n = 0;
  for (let w = scenario === "poucos" ? 0 : WEEKS_BACK; w >= 0; w--) {
    const days =
      w === 0
        ? scenario === "risco"
          ? []
          : [0, 2, 3]
        : gaps.includes(w)
          ? []
          : (PATTERNS[Math.floor(rnd() * PATTERNS.length)] ?? []);
    for (const di of days) {
      const date = addLocalDays(monday, di - w * 7);
      if (date > today) continue;
      const routine = ROUTINES[n++ % ROUTINES.length]!;
      const iso = toLocalISODate(date);
      const session: DaySession = {
        id: `session-${iso}`,
        name: routine.name,
        routineId: routine.id,
        durationSeconds: 44 * 60 + Math.floor(rnd() * 1200),
        volumeKg: Math.round((5600 + (WEEKS_BACK - w) * 22 + rnd() * 4200) / 10) * 10,
        setCount: 16 + Math.floor(rnd() * 8),
        records: rnd() < 0.12 ? [RECORDS[Math.floor(rnd() * RECORDS.length)]!] : [],
      };
      byDay.set(iso, [session]);
    }
  }
  // Um dia com dois treinos (um deles livre, sem volume) e um com dois recordes.
  const recent = [...byDay.keys()].filter((iso) => iso < toLocalISODate(monday)).slice(-2);
  if (recent[0]) byDay.get(recent[0])![0]!.records = RECORDS.slice(0, 2);
  if (recent[1])
    byDay.get(recent[1])!.push({
      id: `session-${recent[1]}-livre`,
      name: "Treino livre",
      routineId: null,
      durationSeconds: 25 * 60 + 40,
      volumeKg: 0,
      setCount: 4,
      records: [],
    });
  return byDay;
}

function toTrainingDays(byDay: Map<string, DaySession[]>, from: string, to: string): TrainingDay[] {
  return [...byDay.entries()]
    .filter(([iso]) => iso >= from && iso <= to)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iso, sessions]) => ({ performedOn: iso, sessions: sessions.length, volumeKg: sessions.reduce((t, s) => t + s.volumeKg, 0) }));
}

/** Sequência como o get_streak() calcula (o mock faz o papel do servidor). */
function mockStreak(byDay: Map<string, DaySession[]>): HistoryOverview["streak"] {
  const trainedWeeks = new Set([...byDay.keys()].map((iso) => toLocalISODate(weekStart(fromLocalISODate(iso)))));
  const thisMonday = weekStart(new Date());
  const trained = (w: number) => trainedWeeks.has(toLocalISODate(addLocalDays(thisMonday, -w * 7)));
  const weekSecured = trained(0);
  let current = 0;
  for (let w = weekSecured ? 0 : 1; trained(w); w++) current++;
  let best = 0;
  let run = 0;
  for (let w = WEEKS_BACK; w >= 0; w--) {
    run = trained(w) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  const weekCount = [...byDay.entries()]
    .filter(([iso]) => iso >= toLocalISODate(thisMonday))
    .reduce((t, [, s]) => t + s.length, 0);
  return { currentStreak: current, bestStreak: best, currentWeekCount: weekCount, weekSecured, streakAtRisk: !weekSecured && current > 0 };
}

export const mockHistoryApi = {
  async getHistoryOverview(client, { from, to }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("unknown") };
    const byDay = buildSessions();
    const first = [...byDay.keys()].sort()[0] ?? null;
    return {
      data: { trainingDays: toTrainingDays(byDay, from, to), streak: mockStreak(byDay), weeklyGoal: 4, weightUnit: "kg", firstTrainedOn: first },
      error: null,
    };
  },
  async getTrainingDays(client, { from, to }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("unknown") };
    return { data: toTrainingDays(buildSessions(), from, to), error: null };
  },
  async getDaySessions(client, { performedOn }) {
    ignoreClient(client);
    await wait();
    return { data: buildSessions().get(performedOn) ?? [], error: null };
  },
} satisfies HistoryApi;
