import type {
  CompetitionDayStat,
  CompetitionParameters,
  CompetitionParticipant,
  CompetitionRange,
  CompetitionWeekScore,
  RpeAdjustment,
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

/** Uma sessão sua no período, com o ajuste de RPE explicado (LGPD Art. 20). */
export interface MyCompetitionSession {
  sessionId: string;
  name: string | null;
  trainingDay: string;
  minutesConsidered: number;
  isValid: boolean;
  counted: boolean;
  rpeInformed: number | null;
  rpeUsed: number | null;
  rpeAdjustment: RpeAdjustment | null;
  load: number;
}

type Result<T = null> = Promise<ApiResult<T>>;

export interface CompetitionApi {
  getCompetitionBoard: (client: GufClient, range: CompetitionRange) => Result<CompetitionBoard>;
  getMyCompetitionSessions: (client: GufClient, range: CompetitionRange) => Result<MyCompetitionSession[]>;
  /** Parâmetros vigentes na temporada da data (regras públicas da pontuação). */
  getCompetitionParameters: (client: GufClient, season: string) => Result<CompetitionParameters>;
  /** Esforço da sessão (1–10): durante o treino ou até 24 h depois de finalizar. */
  setSessionRpe: (client: GufClient, input: { sessionId: string; rpe: number }) => Result;
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
          validSessions: row.valid_sessions,
          weeklyLoad: Number(row.weekly_load),
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

export const getMyCompetitionSessions: CompetitionApi["getMyCompetitionSessions"] = async (client, { from, to }) => {
  try {
    const { data, error } = await client.rpc("get_my_competition_sessions", { p_from: from, p_to: to });
    if (error) return { data: null, error: toApiError(error) };
    return {
      data: data.map((row) => ({
        sessionId: row.session_id,
        name: row.name ?? null,
        trainingDay: row.training_day,
        minutesConsidered: Number(row.minutes_considered),
        isValid: row.is_valid,
        counted: row.counted,
        rpeInformed: row.rpe_informed ?? null,
        rpeUsed: row.rpe_used == null ? null : Number(row.rpe_used),
        rpeAdjustment: row.rpe_flag === "above_average" || row.rpe_flag === "high_share" ? row.rpe_flag : null,
        load: Number(row.session_load),
      })),
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
        effortMax: Number(data.effort_max),
        referenceLoad: Number(data.reference_load),
        minMinutes: Number(data.min_minutes),
        maxMinutes: Number(data.max_minutes),
        bonusPerWeek: Number(data.bonus_per_week),
        bonusMax: Number(data.bonus_max),
        rpeGap: Number(data.rpe_gap),
        rpeHighValue: data.rpe_high_value,
        rpeHighShare: Number(data.rpe_high_share),
        rpeHighCap: Number(data.rpe_high_cap),
        rpeWindowDays: data.rpe_window_days,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const setSessionRpe: CompetitionApi["setSessionRpe"] = async (client, { sessionId, rpe }) => {
  try {
    const { error } = await client.rpc("set_session_rpe", { p_session_id: sessionId, p_rpe: rpe });
    return error ? { data: null, error: toApiError(error) } : { data: null, error: null };
  } catch (e) {
    return { data: null, error: toApiError(e) };
  }
};

export const competitionApi = {
  getCompetitionBoard,
  getMyCompetitionSessions,
  getCompetitionParameters,
  setSessionRpe,
} satisfies CompetitionApi;
