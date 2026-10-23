import type {
  CompetitionDayStat,
  CompetitionParameters,
  CompetitionParticipant,
  CompetitionRange,
  CompetitionWeekScore,
  PointsStatement,
} from "@guf/core";
import type { GufClient } from "./client";
import { apiError, toApiError, type ApiResult } from "./result";
import { resolveAvatarUrl } from "./shared";

/* =====================================================================
 * Contrato — competição entre seguidores mútuos (SÓ ONLINE)
 * Os pontos de cada semana vêm prontos do servidor; ordem e séries são montadas em
 * @guf/core (competition-ranking.ts).
 * ===================================================================== */

export interface CompetitionBoard {
  participants: CompetitionParticipant[];
  weeks: CompetitionWeekScore[];
  days: CompetitionDayStat[];
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface CompetitionApi {
  getCompetitionBoard: (client: GufClient, range: CompetitionRange) => Result<CompetitionBoard>;
  /** Parâmetros vigentes na temporada da data (regras públicas da pontuação). */
  getCompetitionParameters: (client: GufClient, season: string) => Result<CompetitionParameters>;
  /** Extrato dos SEUS pontos no período: semanas com as partes e os treinos (o plano limita como no ranking). */
  getPointsStatement: (client: GufClient, range: CompetitionRange) => Result<PointsStatement>;
}

/* =====================================================================
 * Implementação (Supabase)
 * ===================================================================== */

export const getCompetitionBoard: CompetitionApi["getCompetitionBoard"] = async (client, { from, to }) => {
  try {
    const [participantsRes, weeksRes, daysRes] = await Promise.all([
      client.rpc("get_competition_participants"),
      client.rpc("get_competition_weeks", { p_from: from, p_to: to }),
      client.rpc("get_competition_days", { p_from: from, p_to: to }),
    ]);
    const failed = [participantsRes, weeksRes, daysRes].find((r) => r.error)?.error;
    if (failed) return { data: null, error: toApiError(failed) };
    return {
      data: {
        participants: (participantsRes.data ?? []).map((row) => ({
          userId: row.user_id,
          handle: row.handle,
          name: row.name ?? null,
          avatarUrl: resolveAvatarUrl(client, row.avatar_url, null),
          isMe: row.is_me,
          currentStreak: row.current_streak ?? 0,
        })),
        weeks: (weeksRes.data ?? []).map((row) => ({
          userId: row.user_id,
          weekStart: row.week_start,
          points: row.points,
          constancyPoints: Number(row.constancy_points),
          bonusPoints: Number(row.bonus_points),
          recordPoints: Number(row.record_points),
          volumePoints: Number(row.volume_points),
          validSessions: row.valid_sessions,
          fulfilled: row.fulfilled,
        })),
        days: (daysRes.data ?? []).map((row) => ({
          userId: row.user_id,
          day: row.day,
          workouts: row.workouts,
          volumeKg: Number(row.volume_kg),
          records: row.records,
        })),
      },
      error: null,
    };
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
  getCompetitionBoard,
  getCompetitionParameters,
  getPointsStatement,
} satisfies CompetitionApi;
