/**
 * MOCK do perfil social e seguidores — mesmo contrato de @guf/api (SocialApi).
 *
 * A tela usa os DADOS REAIS. Este mock existe só para ver os estados do design em DESENVOLVIMENTO,
 * via ?estado= (useDevSocialState): padrao · vazio · erro. Dados criados sob demanda (nada roda no
 * carregamento do módulo, senão o build de produção não descarta o mock).
 */
import { addLocalDays, memberHistoryFrom, startOfLocalWeek, toLocalISODate, type SocialVisibility } from "@guf/core";
import {
  apiError,
  type Connection,
  type EvolutionWeek,
  type GufClient,
  type MemberProfile,
  type MemberWorkout,
  type MemberWorkoutDetail,
  type MySocial,
  type SocialApi,
} from "@guf/api";
import { mockEvolutionApi } from "@/mocks/evolution";

export type SocialMockScenario = "padrao" | "vazio" | "erro";

export const MOCK_ME = "me";

interface MockPerson {
  userId: string;
  handle: string;
  name: string;
  visibility: SocialVisibility;
  historyHidden: boolean;
  workouts: number;
  firstWorkoutOn: string;
  streak: number;
  bestStreak: number;
  weeklyVolume: number;
}

interface MockState {
  scenario: SocialMockScenario;
  me: MockPerson;
  people: MockPerson[];
  /** "seguidor→seguido" → status. */
  follows: Map<string, "pending" | "accepted">;
  blocks: Set<string>;
}

let state: MockState | null = null;

function person(userId: string, handle: string, name: string, extra: Partial<MockPerson> = {}): MockPerson {
  return {
    userId,
    handle,
    name,
    visibility: "private",
    historyHidden: false,
    workouts: 120,
    firstWorkoutOn: "2025-03-10",
    streak: 7,
    bestStreak: 12,
    weeklyVolume: 8200,
    ...extra,
  };
}

function seed(scenario: SocialMockScenario): MockState {
  const me = person(MOCK_ME, "glauber.treina", "Glauber Souza", { workouts: 186, streak: 12, bestStreak: 18, historyHidden: true });
  const people = [
    person("marina", "marina.lift", "Marina Albuquerque", { visibility: "open", workouts: 210, streak: 9, weeklyVolume: 8800 }),
    person("lucas", "lucas.prado", "Lucas Prado", { workouts: 240, streak: 12, weeklyVolume: 9200 }),
    person("bia", "bia.moreira", "Bia Moreira", { workouts: 160, streak: 9, weeklyVolume: 8300 }),
    person("rafa", "rafa.lima", "Rafa Lima", { visibility: "open", historyHidden: true, workouts: 98, streak: 4, weeklyVolume: 8400 }),
    person("ju", "ju.andrade", "Ju Andrade", { workouts: 75, streak: 6, weeklyVolume: 7000 }),
    person("pedro", "pedrohk", "Pedro Henrique", { workouts: 40, streak: 2, weeklyVolume: 5200 }),
    person("camila", "camilarocha", "Camila Rocha", { workouts: 64, streak: 3, weeklyVolume: 6100 }),
  ];
  const follows = new Map<string, "pending" | "accepted">();
  if (scenario === "padrao") {
    for (const id of ["marina", "lucas", "rafa"]) {
      follows.set(`${MOCK_ME}→${id}`, "accepted");
      follows.set(`${id}→${MOCK_ME}`, "accepted");
    }
    for (const id of ["bia", "pedro", "camila"]) follows.set(`${id}→${MOCK_ME}`, "pending");
    follows.set(`${MOCK_ME}→ju`, "pending");
  }
  return { scenario, me, people, follows, blocks: new Set() };
}

function current(): MockState {
  state ??= seed("padrao");
  return state;
}

/** Define o cenário (recria os dados ao trocar). */
export function setSocialMockScenario(next: SocialMockScenario) {
  if (state?.scenario !== next) state = seed(next);
}

const LATENCY_MS = 350;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

function ignoreClient(client: GufClient) {
  void client;
}

function find(userId: string | null): MockPerson | undefined {
  const s = current();
  if (!userId || userId === MOCK_ME) return s.me;
  return s.people.find((p) => p.userId === userId && !s.blocks.has(p.userId));
}

function status(follower: string, followee: string) {
  return current().follows.get(`${follower}→${followee}`) ?? null;
}

function relationship(userId: string) {
  if (userId === MOCK_ME) return "self" as const;
  const st = status(MOCK_ME, userId);
  return st === "accepted" ? ("following" as const) : st === "pending" ? ("requested" as const) : ("none" as const);
}

function count(predicate: (follower: string, followee: string, st: string) => boolean): number {
  let n = 0;
  for (const [key, st] of current().follows) {
    const [follower = "", followee = ""] = key.split("→");
    if (predicate(follower, followee, st)) n += 1;
  }
  return n;
}

function card(p: MockPerson) {
  return { userId: p.userId, handle: p.handle, name: p.name, avatarUrl: null };
}

function unlocked(p: MockPerson): boolean {
  return p.userId === MOCK_ME || p.visibility === "open" || status(MOCK_ME, p.userId) === "accepted";
}

function failIfError(): { data: null; error: ReturnType<typeof apiError> } | null {
  return current().scenario === "erro" ? { data: null, error: apiError("network_error") } : null;
}

function profileOf(p: MockPerson): MemberProfile {
  const open = unlocked(p);
  const weeks = Array.from({ length: 8 }, (_, i) => i < 7 || p.streak > 10);
  return {
    ...card(p),
    visibility: p.visibility,
    historyHidden: p.historyHidden,
    isSelf: p.userId === MOCK_ME,
    relationship: relationship(p.userId),
    followsYou: status(p.userId, MOCK_ME) === "accepted",
    isCompetitor: status(MOCK_ME, p.userId) === "accepted" && status(p.userId, MOCK_ME) === "accepted",
    unlocked: open,
    historyVisible: p.userId === MOCK_ME || (open && !p.historyHidden),
    followersCount: count((_, followee, st) => followee === p.userId && st === "accepted") + (p.userId === MOCK_ME ? 0 : 245),
    followingCount: count((follower, _, st) => follower === p.userId && st === "accepted") + (p.userId === MOCK_ME ? 0 : 128),
    workoutsCount: open ? p.workouts : null,
    firstWorkoutOn: open ? p.firstWorkoutOn : null,
    currentStreak: open ? p.streak : null,
    bestStreak: open ? p.bestStreak : null,
    recentWeeks: open ? weeks : null,
  };
}

function evolution(p: MockPerson, weeks: number): EvolutionWeek[] {
  const start = startOfLocalWeek(new Date());
  return Array.from({ length: weeks }, (_, i) => {
    const age = weeks - 1 - i;
    const wobble = Math.sin(i * 1.7);
    return {
      weekStart: toLocalISODate(addLocalDays(start, -7 * age)),
      sessions: 3 + (i % 2),
      volumeKg: Math.round((p.weeklyVolume - age * 60 + wobble * 420) / 10) * 10,
      maxWeightKg: Math.round((80 - age * 0.6 + wobble * 1.4) * 2) / 2,
      activeSeconds: Math.round((3.2 - age * 0.02 + wobble * 0.5) * 3600),
    };
  });
}

const WORKOUT_NAMES = ["Treino B – Costas e Bíceps", "Treino A – Peito e Tríceps", "Treino C – Pernas"];

function workouts(p: MockPerson, limit: number): MemberWorkout[] {
  return Array.from({ length: limit }, (_, i) => {
    const day = addLocalDays(new Date(), -2 * (i + 1));
    return {
      sessionId: `${p.userId}-w${i}`,
      performedOn: toLocalISODate(day),
      finishedAt: day.toISOString(),
      name: WORKOUT_NAMES[i % WORKOUT_NAMES.length] ?? null,
      durationSeconds: 3100 + i * 240,
      sets: 20 + (i % 3) * 2,
      volumeKg: 9800 + (i % 3) * 1500,
      records: i % 3 === 2 ? 2 : i % 3 === 0 ? 1 : 0,
    };
  });
}

/** Dono do treino pelo id do mock (`<userId>-w<n>`, gerado em `workouts`). */
function workoutOwner(sessionId: string): MockPerson | undefined {
  const userId = sessionId.replace(/-w\d+$/, "");
  return userId === sessionId ? undefined : find(userId);
}

/** Detalhe do treino: o exemplo do mock do Resumo, sem o que outra pessoa não vê (observações, projeto). */
async function memberWorkout(client: GufClient, sessionId: string, p: MockPerson): Promise<MemberWorkoutDetail | null> {
  const base = await mockEvolutionApi.getWorkoutSummary(client, { sessionId: "" });
  if (!base.data) return null;
  const { projectName, routineId, ...summary } = base.data;
  void projectName;
  void routineId;
  return {
    ...summary,
    id: sessionId,
    exercises: base.data.exercises.map((e) => ({ ...e, note: null })),
    daySessionIds: [sessionId],
    owner: { userId: p.userId, handle: p.handle, name: p.name, avatarUrl: null },
  };
}

export const mockSocialApi = {
  async getMySocial(client) {
    ignoreClient(client);
    await wait();
    const failed = failIfError();
    if (failed) return failed;
    const s = current();
    const data: MySocial = {
      userId: MOCK_ME,
      handle: s.me.handle,
      visibility: s.me.visibility,
      historyHidden: s.me.historyHidden,
      followersCount: count((_, followee, st) => followee === MOCK_ME && st === "accepted"),
      followingCount: count((follower, _, st) => follower === MOCK_ME && st === "accepted"),
      pendingRequestsCount: count((_, followee, st) => followee === MOCK_ME && st === "pending"),
    };
    return { data, error: null };
  },
  async updateHandle(client, handle) {
    ignoreClient(client);
    await wait();
    const s = current();
    if (s.people.some((p) => p.handle === handle)) return { data: null, error: apiError("handle_taken") };
    s.me.handle = handle;
    return { data: null, error: null };
  },
  async updateSettings(client, { visibility, historyHidden }) {
    ignoreClient(client);
    await wait();
    const s = current();
    if (visibility === "open" && s.me.visibility === "private") {
      for (const [key, st] of s.follows) if (key.endsWith(`→${MOCK_ME}`) && st === "pending") s.follows.set(key, "accepted");
    }
    s.me.visibility = visibility;
    s.me.historyHidden = historyHidden;
    return { data: null, error: null };
  },
  async requestFollow(client, userId) {
    ignoreClient(client);
    await wait();
    const target = find(userId);
    if (!target || userId === MOCK_ME) return { data: null, error: apiError("person_not_found") };
    const st = target.visibility === "open" ? "accepted" : "pending";
    current().follows.set(`${MOCK_ME}→${userId}`, status(MOCK_ME, userId) ?? st);
    return { data: status(MOCK_ME, userId) ?? st, error: null };
  },
  async respondFollowRequest(client, { userId, accept }) {
    ignoreClient(client);
    await wait();
    const s = current();
    if (accept) s.follows.set(`${userId}→${MOCK_ME}`, "accepted");
    else s.follows.delete(`${userId}→${MOCK_ME}`);
    return { data: null, error: null };
  },
  async unfollow(client, userId) {
    ignoreClient(client);
    await wait();
    current().follows.delete(`${MOCK_ME}→${userId}`);
    return { data: null, error: null };
  },
  async removeFollower(client, userId) {
    ignoreClient(client);
    await wait();
    current().follows.delete(`${userId}→${MOCK_ME}`);
    return { data: null, error: null };
  },
  async blockUser(client, userId) {
    ignoreClient(client);
    await wait();
    const s = current();
    s.blocks.add(userId);
    s.follows.delete(`${MOCK_ME}→${userId}`);
    s.follows.delete(`${userId}→${MOCK_ME}`);
    return { data: null, error: null };
  },
  async unblockUser(client, userId) {
    ignoreClient(client);
    await wait();
    current().blocks.delete(userId);
    return { data: null, error: null };
  },
  async listConnections(client, { kind, userId }) {
    ignoreClient(client);
    await wait();
    const failed = failIfError();
    if (failed) return failed;
    const s = current();
    const owner = userId ?? MOCK_ME;
    if (kind === "blocked") {
      const data: Connection[] = s.people
        .filter((p) => s.blocks.has(p.userId))
        .map((p) => ({ ...card(p), status: "blocked", isMutual: false, since: new Date().toISOString() }));
      return { data, error: null };
    }
    const wanted = kind === "followers" || kind === "following" ? "accepted" : "pending";
    const data: Connection[] = [];
    for (const [key, st] of s.follows) {
      const [follower = "", followee = ""] = key.split("→");
      const other = kind === "followers" || kind === "requests" ? (followee === owner ? follower : null) : follower === owner ? followee : null;
      const p = other ? find(other) : undefined;
      if (!p || st !== wanted || p.userId === owner) continue;
      const isMutual = status(owner, p.userId) === "accepted" && status(p.userId, owner) === "accepted";
      data.push({ ...card(p), status: st, isMutual, since: new Date().toISOString() });
    }
    return { data, error: null };
  },
  async searchPeople(client, query) {
    ignoreClient(client);
    await wait();
    const failed = failIfError();
    if (failed) return failed;
    const q = query.trim().replace(/^@/, "").toLowerCase();
    if (q.length < 3) return { data: [], error: null };
    const s = current();
    const data = s.people
      .filter((p) => !s.blocks.has(p.userId) && (p.handle.startsWith(q) || p.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q))))
      .map((p) => ({
        ...card(p),
        visibility: p.visibility,
        relationship: relationship(p.userId),
        followsYou: status(p.userId, MOCK_ME) === "accepted",
      }));
    return { data, error: null };
  },
  async findByHandle(client, handle) {
    ignoreClient(client);
    await wait();
    const h = handle.trim().replace(/^@/, "").toLowerCase();
    const s = current();
    const p = h === s.me.handle ? s.me : s.people.find((x) => x.handle === h && !s.blocks.has(x.userId));
    return p ? { data: p.userId, error: null } : { data: null, error: apiError("person_not_found") };
  },
  async getMemberProfile(client, userId) {
    ignoreClient(client);
    await wait();
    const failed = failIfError();
    if (failed) return failed;
    const p = find(userId);
    return p ? { data: profileOf(p), error: null } : { data: null, error: apiError("person_not_found") };
  },
  async getMemberEvolution(client, { userId, weeks }) {
    ignoreClient(client);
    await wait();
    const p = find(userId);
    if (!p || !unlocked(p)) return { data: null, error: apiError("person_not_found") };
    return { data: evolution(p, weeks), error: null };
  },
  async listMemberWorkouts(client, { userId, limit }) {
    ignoreClient(client);
    await wait();
    const p = find(userId);
    if (!p || !unlocked(p)) return { data: null, error: apiError("person_not_found") };
    if (p.userId !== MOCK_ME && p.historyHidden) return { data: null, error: apiError("history_hidden") };
    // Mesma regra do banco: de outra pessoa, só os treinos do mês atual.
    const from = p.userId === MOCK_ME ? "" : memberHistoryFrom(new Date());
    return { data: workouts(p, limit ?? 3).filter((w) => w.performedOn >= from), error: null };
  },
  async getMemberWorkout(client, { sessionId }) {
    await wait();
    const failed = failIfError();
    if (failed) return failed;
    const p = workoutOwner(sessionId);
    if (!p || !unlocked(p)) return { data: null, error: apiError("session_not_found") };
    if (p.userId !== MOCK_ME && p.historyHidden) return { data: null, error: apiError("history_hidden") };
    const data = await memberWorkout(client, sessionId, p);
    return data ? { data, error: null } : { data: null, error: apiError("session_not_found") };
  },
} satisfies SocialApi;
