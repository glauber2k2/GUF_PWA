import { AVATAR_BUCKET, durationSeconds, pickAvatar, sizedAvatarUrl, type AvatarAuthUser, type LoggedSet, type SetType, type WeightUnit } from "@guf/core";
import type { Database } from "@guf/types";
import type { GufClient } from "./client";

/* Tipos e conversões usados por mais de uma tela (Início e Histórico). */

/** Dia treinado (get_training_days). */
export interface TrainingDay {
  performedOn: string;
  sessions: number;
  volumeKg: number;
}

export interface StreakSummary {
  currentStreak: number;
  bestStreak: number;
  currentWeekCount: number;
  weekSecured: boolean;
  streakAtRisk: boolean;
}

export const FREE_WORKOUT_NAME = "Treino livre";

/** Unidade de peso do perfil (qualquer valor que não seja "lb" vale kg). */
export const toWeightUnit = (value: string | null | undefined): WeightUnit => (value === "lb" ? "lb" : "kg");

/**
 * URL da foto a exibir (regra em @guf/core avatar.ts): foto enviada (Storage) > foto social atual
 * (sessão) > foto social do cadastro (profiles.avatar_url) > null (a tela mostra a inicial).
 */
export function resolveAvatarUrl(client: GufClient, profileAvatar: string | null | undefined, user: AvatarAuthUser | null | undefined): string | null {
  const source = pickAvatar(profileAvatar, user);
  if (!source) return null;
  if (source.kind === "url") return sizedAvatarUrl(source.url);
  // Foto enviada: bucket público (migration edit_profile), caminho <user_id>/arquivo.
  return client.storage.from(AVATAR_BUCKET).getPublicUrl(source.path).data.publicUrl;
}

type Functions = Database["public"]["Functions"];

export async function currentUserId(client: GufClient): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

export function toTrainingDay(row: Functions["get_training_days"]["Returns"][number]): TrainingDay {
  return { performedOn: row.performed_on, sessions: row.sessions, volumeKg: Number(row.total_volume_kg) };
}

/** Linha do get_streak() (sem linha = usuário sem treinos). */
export function toStreakSummary(row: Functions["get_streak"]["Returns"][number] | undefined): StreakSummary {
  return {
    currentStreak: row?.current_streak ?? 0,
    bestStreak: row?.best_streak ?? 0,
    currentWeekCount: row?.current_week_count ?? 0,
    weekSecured: row?.week_secured ?? false,
    streakAtRisk: row?.streak_at_risk ?? false,
  };
}

interface SetLogRow {
  set_type: string;
  weight_kg: number | null;
  reps: number | null;
  is_completed: boolean;
}

export function toLoggedSets(rows: readonly SetLogRow[]): LoggedSet[] {
  return rows.map((l) => ({ setType: l.set_type as SetType, weightKg: l.weight_kg, reps: l.reps, isCompleted: l.is_completed }));
}

interface FinishedSessionRow {
  started_at: string;
  finished_at: string | null;
  active_seconds: number | null;
}

/** Duração exibida: tempo efetivo (sem pausas); treinos antigos sem o campo usam início → fim. */
export function sessionDurationSeconds(row: FinishedSessionRow): number {
  return row.active_seconds ?? durationSeconds(row.started_at, row.finished_at);
}


/** 1º treino, total e última rotina numa chamada só (get_training_totals). */
export interface TrainingTotals {
  firstTrainedOn: string | null;
  completedSessions: number;
  /** Última rotina concluída (para sugerir a próxima). */
  lastRoutine: { routineId: string; performedOn: string } | null;
}

/** 1º treino, total de concluídos (até `until`, se informado) e última rotina feita. */
export async function fetchTrainingTotals(client: GufClient, until?: string): Promise<{ data: TrainingTotals | null; error: unknown }> {
  const { data, error } = await client.rpc("get_training_totals", until ? { p_until: until } : {});
  if (error) return { data: null, error };
  const row = data?.[0];
  return {
    data: {
      firstTrainedOn: row?.first_trained_on ?? null,
      completedSessions: row?.completed_sessions ?? 0,
      lastRoutine: row?.last_routine_id && row.last_routine_on ? { routineId: row.last_routine_id, performedOn: row.last_routine_on } : null,
    },
    error: null,
  };
}

/** Melhor 1RM estimado de cada exercício em todo o histórico (get_best_e1rm). */
export async function fetchBestE1rm(client: GufClient, exerciseIds: readonly string[]): Promise<{ data: Map<string, number> | null; error: unknown }> {
  const { data, error } = await client.rpc("get_best_e1rm", { p_exercise_ids: [...exerciseIds] });
  if (error) return { data: null, error };
  return {
    data: new Map((data ?? []).filter((row) => row.best_e1rm_kg !== null).map((row) => [row.exercise_id, Number(row.best_e1rm_kg)])),
    error: null,
  };
}
