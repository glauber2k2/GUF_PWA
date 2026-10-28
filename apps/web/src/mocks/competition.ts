/**
 * MOCK da competição — mesmo contrato de @guf/api (CompetitionApi).
 *
 * Só para ver os estados do design em DESENVOLVIMENTO, via ?estado= (useDevSocialState):
 * padrao · vazio (só você, sem amigos) · erro · lider (você em 1º) · muitos (1000 competidores, para a
 * paginação). Dados gerados sob demanda e
 * determinísticos (a mesma semente gera os mesmos treinos).
 */
import {
  addLocalDays,
  buildCompetitionStory,
  seasonOf,
  COMPETITION_PAGE_SIZE,
  normalizeSearch,
  RIVAL_PAGE_SIZE,
  rankCompetitors,
  toStandings,
  fromLocalISODate,
  startOfLocalWeek,
  toLocalISODate,
  type CompetitionDayStat,
  type CompetitionMetric,
  type CompetitionRange,
  type CompetitionStanding,
  type CompetitionStory,
  type CompetitionParticipant,
  type CompetitionWeekScore,
  type PointsStatement,
  type StatementSession,
  type StatementWeek,
} from "@guf/core";
import { apiError, type CompetitionApi, type GufClient } from "@guf/api";

export type CompetitionMockScenario = "padrao" | "vazio" | "erro" | "lider" | "muitos";

let scenario: CompetitionMockScenario = "padrao";

export function setCompetitionMockScenario(next: CompetitionMockScenario) {
  scenario = next;
}

interface MockCompetitor {
  userId: string;
  handle: string;
  name: string;
  /** Treinos por semana em média. */
  rate: number;
  volume: number;
  recordChance: number;
  streak: number;
}

function competitors(): MockCompetitor[] {
  const all: MockCompetitor[] = [
    { userId: "me", handle: "glauber.treina", name: "Glauber Souza", rate: 4.1, volume: 8800, recordChance: 0.22, streak: 7 },
    { userId: "lucas", handle: "lucas.prado", name: "Lucas Prado", rate: 5, volume: 9200, recordChance: 0.2, streak: 12 },
    { userId: "bia", handle: "bia.moreira", name: "Bia Moreira", rate: 4.6, volume: 8300, recordChance: 0.24, streak: 9 },
    { userId: "rafa", handle: "rafa.lima", name: "Rafa Lima", rate: 4, volume: 8400, recordChance: 0.2, streak: 4 },
    { userId: "ju", handle: "ju.andrade", name: "Ju Andrade", rate: 3.6, volume: 7000, recordChance: 0.18, streak: 6 },
    { userId: "thiago", handle: "thiago.reis", name: "Thiago Reis", rate: 3, volume: 9800, recordChance: 0.15, streak: 2 },
    { userId: "carol", handle: "carol.nunes", name: "Carol Nunes", rate: 3.2, volume: 6100, recordChance: 0.2, streak: 5 },
    { userId: "dudu", handle: "dudu.faria", name: "Dudu Faria", rate: 2.2, volume: 7400, recordChance: 0.12, streak: 1 },
  ];
  if (scenario === "vazio") return all.slice(0, 1);
  if (scenario === "muitos") return [...all, ...crowd(all.length)];
  if (scenario === "lider") return all.map((c) => (c.userId === "me" ? { ...c, rate: 5.6, volume: 10_400 } : c));
  return all;
}

const CROWD_SIZE = 1000;
const FIRST_NAMES = ["Ana", "Bruno", "Caio", "Duda", "Enzo", "Fê", "Gabi", "Hugo", "Iris", "João", "Kaká", "Léo", "Malu", "Nina", "Otto", "Pri"];
const LAST_NAMES = ["Silva", "Souza", "Costa", "Rocha", "Alves", "Pires", "Lima", "Gomes"];

/** Competidores fictícios para ver a paginação com muita gente (determinísticos). */
function crowd(alreadyListed: number): MockCompetitor[] {
  return Array.from({ length: CROWD_SIZE - alreadyListed }, (_, i) => {
    const next = random(`crowd-${i}`);
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    return {
      userId: `crowd-${i}`,
      handle: `${first.toLowerCase()}.${last.toLowerCase()}${i}`,
      name: `${first} ${last}`,
      rate: 1 + next() * 4.5,
      volume: 4000 + Math.round(next() * 7000),
      recordChance: next() * 0.25,
      streak: Math.floor(next() * 10),
    };
  });
}

/** Gerador pseudoaleatório determinístico (FNV-1a + mulberry32). */
function random(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function simulate(range: { from: string; to: string }) {
  const days: CompetitionDayStat[] = [];
  const weeks: CompetitionWeekScore[] = [];
  const first = startOfLocalWeek(fromLocalISODate(range.from));
  const last = fromLocalISODate(range.to);
  for (const c of competitors()) {
    const next = random(c.userId);
    let consecutive = 0;
    for (let week = first; week <= last; week = addLocalDays(week, 7)) {
      let sessions = 0;
      let records = 0;
      for (let d = 0; d < 7; d++) {
        const day = addLocalDays(week, d);
        if (day > last || next() >= c.rate / 7) continue;
        sessions += 1;
        const record = next() < c.recordChance ? 1 : 0;
        records += record;
        const iso = toLocalISODate(day);
        if (iso >= range.from) {
          days.push({ userId: c.userId, day: iso, workouts: 1, volumeKg: Math.round(c.volume * (0.85 + next() * 0.3)), records: record });
        }
      }
      const fulfilled = sessions >= 3;
      consecutive = fulfilled ? consecutive + 1 : 0;
      // Mesma regra do servidor (competition_week_scores), com volume simulado perto da média.
      const constancyPoints = Math.min(sessions, 3) * 20;
      const bonusPoints = fulfilled ? Math.min(20, 5 * consecutive) : 0;
      const recordPoints = Math.min(25, records * 5);
      const volumePoints = sessions > 0 ? Math.round(15 * Math.min(1, 0.7 + next() * 0.4) * 100) / 100 : 0;
      weeks.push({
        userId: c.userId,
        weekStart: toLocalISODate(week),
        points: Math.round(constancyPoints + bonusPoints + recordPoints + volumePoints),
        constancyPoints,
        bonusPoints,
        recordPoints,
        volumePoints,
        validSessions: sessions,
        fulfilled,
      });
    }
  }
  return { days, weeks };
}

const LATENCY_MS = 400;
const WORKOUT_NAMES = ["Treino A – Peito e Tríceps", "Treino B – Costas e Bíceps", "Treino C – Pernas", "Treino D – Ombros e Abdômen", "Full-body"];
const RULE = { perDay: 15, minMinutes: 20, bonusPerWeek: 5, bonusMax: 20, recordPoints: 5, recordsMax: 25, volumeMax: 15, fulfilledDays: 3 };

/** Seus treinos e semanas no período, pela mesma regra do servidor (sob demanda, nunca no carregamento). */
function simulateStatement(range: { from: string; to: string }): PointsStatement {
  const rand = random("extrato");
  const sessions: StatementSession[] = [];
  const weeks: StatementWeek[] = [];
  let streak = 2;
  let averageVolume = 8_000;
  const last = fromLocalISODate(range.to);
  for (let week = startOfLocalWeek(fromLocalISODate(range.from)); week <= last; week = addLocalDays(week, 7)) {
    const weekStart = toLocalISODate(week);
    const weekSessions: StatementSession[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addLocalDays(week, d);
      if (date > last || rand() > 0.62) continue;
      const day = toLocalISODate(date);
      const minutes = rand() < 0.12 ? Math.round(8 + rand() * 10) : Math.round(35 + rand() * 35);
      const volumeKg = Math.round((6_000 + rand() * 5_000) / 10) * 10;
      const base = { day, weekStart, isValid: minutes >= RULE.minMinutes, counted: false };
      weekSessions.push({ ...base, sessionId: `${day}-a`, name: WORKOUT_NAMES[Math.floor(rand() * WORKOUT_NAMES.length)] ?? "Treino", minutes, volumeKg, records: rand() < 0.22 ? 1 + Math.floor(rand() * 2) : 0 });
      if (rand() < 0.08) {
        weekSessions.push({ ...base, sessionId: `${day}-b`, name: "Cardio leve", minutes: 25, isValid: true, volumeKg: 900, records: 0 });
      }
    }
    for (const day of new Set(weekSessions.map((x) => x.day))) {
      const best = weekSessions.filter((x) => x.day === day && x.isValid).sort((a, b) => b.volumeKg - a.volumeKg)[0];
      if (best) best.counted = true;
    }
    const validSessions = weekSessions.filter((x) => x.counted).length;
    const fulfilled = validSessions >= RULE.fulfilledDays;
    streak = fulfilled ? streak + 1 : 0;
    const records = weekSessions.reduce((sum, x) => sum + x.records, 0);
    const weeklyVolumeKg = weekSessions.reduce((sum, x) => sum + x.volumeKg, 0);
    const constancyPoints = validSessions * RULE.perDay;
    const bonusPoints = fulfilled ? Math.min(RULE.bonusMax, RULE.bonusPerWeek * streak) : 0;
    const recordPoints = Math.min(RULE.recordsMax, records * RULE.recordPoints);
    const volumePoints = weeklyVolumeKg > 0 ? Math.round(RULE.volumeMax * Math.min(1, weeklyVolumeKg / averageVolume) * 100) / 100 : 0;
    if (weeklyVolumeKg > 0) averageVolume = (averageVolume * 3 + weeklyVolumeKg) / 4;
    sessions.push(...weekSessions);
    weeks.push({
      weekStart,
      points: Math.round(constancyPoints + bonusPoints + recordPoints + volumePoints),
      constancyPoints,
      bonusPoints,
      recordPoints,
      volumePoints,
      validSessions,
      weeklyVolumeKg,
      records,
      fulfilled,
    });
  }
  return { visibleFrom: range.from, weeks, sessions };
}

const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

function ignoreClient(client: GufClient) {
  void client;
}

function participants(): CompetitionParticipant[] {
  return competitors().map((c) => ({ userId: c.userId, handle: c.handle, name: c.name, avatarUrl: null, isMe: c.userId === "me", currentStreak: c.streak }));
}

/** Classificação completa pela regra do core (o banco faz o mesmo em competition_standings). */
function standings(range: CompetitionRange, metric: CompetitionMetric): CompetitionStanding[] {
  const { weeks, days } = simulate(range);
  return toStandings(rankCompetitors(participants(), weeks, days, metric, range));
}

export const mockCompetitionApi = {
  async getCompetitionStandings(client, { from, to, metric, page }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    const all = standings({ from, to }, metric);
    const start = (Math.max(page, 1) - 1) * COMPETITION_PAGE_SIZE;
    return { data: { items: all.slice(start, start + COMPETITION_PAGE_SIZE), total: all.length }, error: null };
  },
  async getStandingsNearMe(client, { from, to, metric, radius }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    const all = standings({ from, to }, metric);
    const me = all.find((s) => s.isMe);
    const items = me ? all.filter((s) => Math.abs(s.position - me.position) <= radius) : [];
    return { data: { items, total: all.length }, error: null };
  },
  async getStandingsOf(client, { from, to, metric, userIds }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    return { data: standings({ from, to }, metric).filter((s) => userIds.includes(s.userId)), error: null };
  },
  async searchRivals(client, { from, to, metric, search, page }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    const key = normalizeSearch(search);
    const handle = key.replace(/^@/, "");
    const matches = standings({ from, to }, metric).filter(
      (s) => !s.isMe && (!key || normalizeSearch(s.name ?? "").includes(key) || s.handle.startsWith(handle)),
    );
    const start = (Math.max(page, 1) - 1) * RIVAL_PAGE_SIZE;
    return { data: { items: matches.slice(start, start + RIVAL_PAGE_SIZE), total: matches.length }, error: null };
  },
  async getCompetitionSeries(client, { from, to, userIds }) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    const { weeks, days } = simulate({ from, to });
    return { data: { weeks: weeks.filter((w) => userIds.includes(w.userId)), days: days.filter((d) => userIds.includes(d.userId)) }, error: null };
  },
  async getPointsStatement(client, range) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    if (scenario === "vazio") return { data: { visibleFrom: range.from, weeks: [], sessions: [] }, error: null };
    return { data: simulateStatement(range), error: null };
  },
  async getCompetitionParameters(client) {
    ignoreClient(client);
    await wait(100);
    return {
      data: {
        effectiveFrom: "2026-01-01",
        fulfilledWeekDays: 3,
        constancyPointsPerDay: 15,
        minMinutes: 20,
        maxMinutes: 120,
        bonusPerWeek: 5,
        bonusMax: 20,
        recordPoints: 5,
        recordsMax: 25,
        volumeMax: 15,
        volumeWindowWeeks: 4,
      },
      error: null,
    };
  },
} satisfies CompetitionApi;

/** Semanas de exemplo da temporada (pontos e partes coerentes), para a galeria de PNGs. */
function sampleStoryWeeks(season: Date): StatementWeek[] {
  const rows = [
    { points: 110, constancy: 60, bonus: 5, records: 10, volume: 15, sessions: 4 },
    { points: 135, constancy: 75, bonus: 10, records: 20, volume: 15, sessions: 5 },
    { points: 98, constancy: 45, bonus: 15, records: 25, volume: 13, sessions: 3 },
    { points: 160, constancy: 90, bonus: 20, records: 35, volume: 15, sessions: 6 },
  ];
  const first = startOfLocalWeek(season);
  return rows.map((r, i) => ({
    weekStart: toLocalISODate(addLocalDays(first, i * 7)),
    points: r.points,
    constancyPoints: r.constancy,
    bonusPoints: r.bonus,
    recordPoints: r.records,
    volumePoints: r.volume,
    validSessions: r.sessions,
    weeklyVolumeKg: 12_000 + i * 900,
    records: r.records / 5,
    fulfilled: r.sessions >= 3,
  }));
}

function sampleStanding(userId: string, rank: number, previousRank: number, value: number, isMe: boolean): CompetitionStanding {
  return {
    userId,
    handle: isMe ? "voce" : "amigo",
    name: null,
    avatarUrl: null,
    isMe,
    currentStreak: 0,
    totals: { points: value, workouts: 0, volumeKg: 0, records: 0, fulfilledWeeks: 0, validSessions: 0 },
    value,
    rank,
    previousRank,
    position: rank,
  };
}

/**
 * Duas situações da competição para a galeria de PNGs (só desenvolvimento): você liderando por pouco no
 * último dia da temporada e você subindo, ainda atrás do 1º. Gerado sob demanda.
 */
export function mockCompetitionStories(): Array<{ label: string; story: CompetitionStory }> {
  const now = new Date();
  const season = seasonOf(now);
  const weeks = sampleStoryWeeks(season);
  const points = weeks.reduce((n, w) => n + w.points, 0);
  const lastDay = new Date(season.getFullYear(), season.getMonth() + 1, 0);
  const lastSaturday = addLocalDays(lastDay, -((lastDay.getDay() + 1) % 7));
  const endOfSeasonEvening = new Date(lastSaturday.getFullYear(), lastSaturday.getMonth(), lastSaturday.getDate(), 21, 45, 23);
  return [
    {
      label: "Liderando no último dia",
      story: buildCompetitionStory({
        me: sampleStanding("me", 1, 3, points, true),
        leader: sampleStanding("me", 1, 3, points, true),
        runnerUp: sampleStanding("rival", 2, 1, points - 12, false),
        total: 8,
        weeks,
        season,
        now: endOfSeasonEvening,
      }),
    },
    {
      label: "Subindo, atrás do 1º",
      story: buildCompetitionStory({
        me: sampleStanding("me", 2, 5, points, true),
        leader: sampleStanding("leader", 1, 1, points + 80, false),
        runnerUp: sampleStanding("rival", 3, 2, points - 30, false),
        total: 8,
        weeks,
        season,
        now,
      }),
    },
  ];
}
