/**
 * MOCK da competição — mesmo contrato de @guf/api (CompetitionApi).
 *
 * Só para ver os estados do design em DESENVOLVIMENTO, via ?estado= (useDevSocialState):
 * padrao · vazio (só você, sem amigos) · erro · lider (você em 1º). Dados gerados sob demanda e
 * determinísticos (a mesma semente gera os mesmos treinos).
 */
import {
  addLocalDays,
  fromLocalISODate,
  startOfLocalWeek,
  toLocalISODate,
  type CompetitionDayStat,
  type CompetitionParticipant,
  type CompetitionWeekScore,
} from "@guf/core";
import { apiError, type CompetitionApi, type GufClient } from "@guf/api";

export type CompetitionMockScenario = "padrao" | "vazio" | "erro" | "lider";

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
  if (scenario === "lider") return all.map((c) => (c.userId === "me" ? { ...c, rate: 5.6, volume: 10_400 } : c));
  return all;
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
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

function ignoreClient(client: GufClient) {
  void client;
}

export const mockCompetitionApi = {
  async getCompetitionBoard(client, range) {
    ignoreClient(client);
    await wait();
    if (scenario === "erro") return { data: null, error: apiError("network_error") };
    const participants: CompetitionParticipant[] = competitors().map((c) => ({
      userId: c.userId,
      handle: c.handle,
      name: c.name,
      avatarUrl: null,
      isMe: c.userId === "me",
      currentStreak: c.streak,
    }));
    return { data: { participants, ...simulate(range) }, error: null };
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
