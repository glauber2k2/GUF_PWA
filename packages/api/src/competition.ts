import {
  COMPETITION_PAGE_SIZE,
  type CompetitionDayStat,
  type CompetitionMetric,
  type CompetitionParameters,
  type CompetitionRange,
  type CompetitionStanding,
  type CompetitionStandingsPage,
  type CompetitionWeekScore,
  type PointsStatement,
} from "@guf/core";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import { resolveAvatarUrl } from "./shared";

/* =====================================================================
 * Contrato — competição entre seguidores mútuos (SÓ ONLINE)
 * O banco ordena e pagina a classificação (get_competition_standings, mesma regra de
 * rankCompetitors em @guf/core); o app pede só o que mostra. Séries (gráfico e duelo) só das
 * pessoas pedidas, nunca de todos os competidores.
 * ===================================================================== */

/** Semanas (pontos) e dias (treinos, volume, recordes) de algumas pessoas, para o gráfico e o duelo. */
export interface CompetitionSeries {
  weeks: CompetitionWeekScore[];
  days: CompetitionDayStat[];
}

export interface StandingsQuery extends CompetitionRange {
  metric: CompetitionMetric;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface CompetitionApi {
  /** Uma página da classificação (1 = primeira), com o total de pessoas. */
  getCompetitionStandings: (client: GufClient, query: StandingsQuery & { page: number }) => Result<CompetitionStandingsPage>;
  /** Você e as posições vizinhas (`radius` à frente e atrás), com o total. */
  getStandingsNearMe: (client: GufClient, query: StandingsQuery & { radius: number }) => Result<CompetitionStandingsPage>;
  /** Pessoas específicas com a posição na classificação geral (até 10). */
  getStandingsOf: (client: GufClient, query: StandingsQuery & { userIds: string[] }) => Result<CompetitionStanding[]>;
  /** Semanas e dias só das pessoas pedidas (até 10). */
  getCompetitionSeries: (client: GufClient, query: CompetitionRange & { userIds: string[] }) => Result<CompetitionSeries>;
  /** Parâmetros vigentes na temporada da data (regras públicas da pontuação). */
  getCompetitionParameters: (client: GufClient, season: string) => Result<CompetitionParameters>;
  /** Extrato dos SEUS pontos no período: semanas com as partes e os treinos (o plano limita como no ranking). */
  getPointsStatement: (client: GufClient, range: CompetitionRange) => Result<PointsStatement>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

interface StandingRow {
  user_id: string;
  handle: string;
  name: string | null;
  avatar_url: string | null;
  is_me: boolean;
  current_streak: number | null;
  points: number;
  workouts: number;
  volume_kg: number;
  records: number;
  fulfilled_weeks: number;
  valid_sessions: number;
  value: number;
  rank: number;
  previous_rank: number;
  position: number;
  total_count: number;
}

function toStanding(client: GufClient, row: StandingRow): CompetitionStanding {
  return {
    userId: row.user_id,
    handle: row.handle,
    name: row.name ?? null,
    avatarUrl: resolveAvatarUrl(client, row.avatar_url, null),
    isMe: row.is_me,
    currentStreak: row.current_streak ?? 0,
    totals: {
      points: Number(row.points),
      workouts: Number(row.workouts),
      volumeKg: Number(row.volume_kg),
      records: Number(row.records),
      fulfilledWeeks: Number(row.fulfilled_weeks),
      validSessions: Number(row.valid_sessions),
    },
    value: Number(row.value),
    rank: Number(row.rank),
    previousRank: Number(row.previous_rank),
    position: Number(row.position),
  };
}

function toPage(client: GufClient, rows: StandingRow[] | null): CompetitionStandingsPage {
  const list = rows ?? [];
  return { items: list.map((row) => toStanding(client, row)), total: Number(list[0]?.total_count ?? 0) };
}

interface WeekRow {
  user_id: string;
  week_start: string;
  points: number;
  constancy_points: number;
  bonus_points: number;
  record_points: number;
  volume_points: number;
  valid_sessions: number;
  fulfilled: boolean;
}

interface DayRow {
  user_id: string;
  day: string;
  workouts: number;
  volume_kg: number;
  records: number;
}

function toWeek(row: WeekRow): CompetitionWeekScore {
  return {
    userId: row.user_id,
    weekStart: row.week_start,
    points: Number(row.points),
    constancyPoints: Number(row.constancy_points),
    bonusPoints: Number(row.bonus_points),
    recordPoints: Number(row.record_points),
    volumePoints: Number(row.volume_points),
    validSessions: Number(row.valid_sessions),
    fulfilled: row.fulfilled,
  };
}

function toDay(row: DayRow): CompetitionDayStat {
  return { userId: row.user_id, day: row.day, workouts: Number(row.workouts), volumeKg: Number(row.volume_kg), records: Number(row.records) };
}

async function runStandings<T>(call: () => PromiseLike<{ data: unknown; error: unknown }>, map: (rows: StandingRow[] | null) => T): Result<T> {
  try {
    const { data, error } = await call();
    if (error) return { data: null, error: toApiError(error) };
    return { data: map(data as StandingRow[] | null), error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
}

export const getCompetitionStandings: CompetitionApi["getCompetitionStandings"] = (client, { from, to, metric, page }) =>
  runStandings(
    () =>
      client.rpc("get_competition_standings", {
        p_from: from,
        p_to: to,
        p_metric: metric,
        p_offset: (Math.max(page, 1) - 1) * COMPETITION_PAGE_SIZE,
        p_limit: COMPETITION_PAGE_SIZE,
      }),
    (rows) => toPage(client, rows),
  );

export const getStandingsNearMe: CompetitionApi["getStandingsNearMe"] = (client, { from, to, metric, radius }) =>
  runStandings(() => client.rpc("get_competition_standings_near_me", { p_from: from, p_to: to, p_metric: metric, p_radius: radius }), (rows) => toPage(client, rows));

export const getStandingsOf: CompetitionApi["getStandingsOf"] = (client, { from, to, metric, userIds }) =>
  runStandings(
    () => client.rpc("get_competition_standings_of", { p_from: from, p_to: to, p_metric: metric, p_user_ids: userIds }),
    (rows) => (rows ?? []).map((row) => toStanding(client, row)),
  );

export const getCompetitionSeries: CompetitionApi["getCompetitionSeries"] = async (client, { from, to, userIds }) => {
  if (userIds.length === 0) return { data: { weeks: [], days: [] }, error: null };
  try {
    const { data, error } = await client.rpc("get_competition_series", { p_from: from, p_to: to, p_user_ids: userIds });
    if (error) return { data: null, error: toApiError(error) };
    const json = (data ?? {}) as { weeks?: WeekRow[]; days?: DayRow[] };
    return { data: { weeks: (json.weeks ?? []).map(toWeek), days: (json.days ?? []).map(toDay) }, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const getCompetitionParameters: CompetitionApi["getCompetitionParameters"] = async (client, season) => {
  try {
    const { data, error } = await client
      .from("competition_parameters")
      .select("*")
      .lte("effective_from", season)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { data: null, error: toApiError(error) };
    if (!data) return { data: null, error: apiError("unknown") };
    return {
      data: {
        effectiveFrom: data.effective_from,
        fulfilledWeekDays: data.sessions_for_max_constancy,
        constancyPointsPerDay: Number(data.constancy_points_per_day),
        minMinutes: Number(data.min_minutes),
        maxMinutes: Number(data.max_minutes),
        bonusPerWeek: Number(data.bonus_per_week),
        bonusMax: Number(data.bonus_max),
        recordPoints: Number(data.record_points),
        recordsMax: Number(data.records_max),
        volumeMax: Number(data.volume_max),
        volumeWindowWeeks: data.volume_window_weeks,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

interface StatementRow {
  visible_from: string | null;
  weeks: Array<{
    week_start: string;
    points: number;
    constancy_points: number;
    bonus_points: number;
    record_points: number;
    volume_points: number;
    valid_sessions: number;
    weekly_volume: number;
    records: number;
    fulfilled: boolean;
  }>;
  sessions: Array<{
    session_id: string;
    name: string;
    day: string;
    week_start: string;
    minutes: number;
    is_valid: boolean;
    counted: boolean;
    volume: number;
    records: number;
  }>;
}

function toPointsStatement(row: StatementRow): PointsStatement {
  return {
    visibleFrom: row.visible_from,
    weeks: row.weeks.map((w) => ({
      weekStart: w.week_start,
      points: Number(w.points),
      constancyPoints: Number(w.constancy_points),
      bonusPoints: Number(w.bonus_points),
      recordPoints: Number(w.record_points),
      volumePoints: Number(w.volume_points),
      validSessions: Number(w.valid_sessions),
      weeklyVolumeKg: Number(w.weekly_volume),
      records: Number(w.records),
      fulfilled: w.fulfilled,
    })),
    sessions: row.sessions.map((x) => ({
      sessionId: x.session_id,
      name: x.name,
      day: x.day,
      weekStart: x.week_start,
      minutes: Number(x.minutes),
      isValid: x.is_valid,
      counted: x.counted,
      volumeKg: Number(x.volume),
      records: Number(x.records),
    })),
  };
}

export const getPointsStatement: CompetitionApi["getPointsStatement"] = async (client, { from, to }) => {
  try {
    const { data, error } = await client.rpc("get_my_points_statement", { p_from: from, p_to: to });
    if (error) return { data: null, error: toApiError(error) };
    return { data: toPointsStatement(data as unknown as StatementRow), error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const competitionApi = {
  getCompetitionStandings,
  getStandingsNearMe,
  getStandingsOf,
  getCompetitionSeries,
  getCompetitionParameters,
  getPointsStatement,
} satisfies CompetitionApi;
