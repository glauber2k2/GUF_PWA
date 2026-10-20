import type { CompetitionDayStat, CompetitionParameters, CompetitionParticipant, CompetitionRange, CompetitionWeekScore } from "@guf/core";
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
        sessionsForMaxConstancy: data.sessions_for_max_constancy,
        constancyMax: Number(data.constancy_max),
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

export const competitionApi = {
  getCompetitionBoard,
  getCompetitionParameters,
} satisfies CompetitionApi;
