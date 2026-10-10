import type { GufClient } from "./client";

/**
 * CONTRATO dos dados da tela Início.
 *
 * As implementações reais (Supabase) entram numa próxima etapa neste pacote, com estes
 * mesmos nomes e assinaturas. Até lá, apps/web/src/mocks/home.ts implementa o contrato
 * (`satisfies HomeApi`) — integrar será só trocar a importação.
 *
 * Fontes previstas da implementação real:
 * - profile: profiles (name, weekly_goal)
 * - activeProject/routines: projects (is_active) + routines (position) + routine_exercises
 * - lastFinishedRoutineId / sessions: workout_sessions (status, performed_on, routine_id)
 * - streak: get_streak()
 * - trainingDays: get_training_days(p_from, p_to)
 */

export type ApiErrorCode = "network_error" | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  /** Mensagem pronta para o usuário: diz o que aconteceu e como resolver. */
  message: string;
}

/** Mesmo formato do supabase-js: sucesso com `data` ou falha com `error`, nunca os dois. */
export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  network_error: "Sem conexão. Verifique a internet e tente de novo.",
  unknown: "Não foi possível carregar agora. Tente de novo em instantes.",
};

export function apiError(code: ApiErrorCode): ApiError {
  return { code, message: API_ERROR_MESSAGES[code] };
}

export interface PlannedExercise {
  name: string;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
}

export interface RoutineSummary {
  id: string;
  name: string;
  position: number;
  /** Grupos musculares principais (para as tags). */
  muscleGroups: string[];
  /** Exercícios na ordem planejada (a tela mostra os 3 primeiros). */
  exercises: PlannedExercise[];
  /** Duração estimada em minutos, se houver base para estimar. */
  estimatedMinutes: number | null;
}

/** Treino concluído (resumo para os cards e para a folha do dia). */
export interface FinishedSession {
  id: string;
  routineId: string | null;
  /** Nome exibido: nome da rotina ou "Treino livre". */
  name: string;
  /** Data local "yyyy-MM-dd". */
  performedOn: string;
  durationSeconds: number;
  volumeKg: number;
  setCount: number;
}

export interface StreakSummary {
  currentStreak: number;
  bestStreak: number;
  currentWeekCount: number;
  weekSecured: boolean;
  streakAtRisk: boolean;
}

export interface HomeSummary {
  profile: {
    name: string | null;
    /** Meta semanal (só exibição). */
    weeklyGoal: number | null;
  };
  /** Projeto ativo com suas rotinas (ordenadas por position); null se não houver. */
  activeProject: { id: string; name: string; routines: RoutineSummary[] } | null;
  /** true se o usuário tem alguma rotina (em qualquer projeto) — diferencia "novo" de "sem plano". */
  hasAnyRoutine: boolean;
  /** Rotina do último treino concluído (para sugerir a próxima). */
  lastFinishedRoutineId: string | null;
  /** Treinos concluídos na semana atual (seg–dom), incluindo hoje. */
  weekSessions: FinishedSession[];
  streak: StreakSummary;
}

export interface GetHomeSummaryInput {
  /** Hoje, data local "yyyy-MM-dd". */
  today: string;
  /** Segunda e domingo da semana atual, datas locais "yyyy-MM-dd". */
  weekStart: string;
  weekEnd: string;
}

export type GetHomeSummary = (client: GufClient, input: GetHomeSummaryInput) => Promise<ApiResult<HomeSummary>>;

export interface StartWorkoutInput {
  /** Rotina escolhida; null = treino livre (vazio). */
  routineId: string | null;
  /** Data LOCAL do usuário "yyyy-MM-dd" (nunca o padrão UTC do banco). */
  performedOn: string;
}

/** Cria a sessão de treino (o banco recusa um segundo treino em andamento). */
export type StartWorkout = (client: GufClient, input: StartWorkoutInput) => Promise<ApiResult<{ sessionId: string }>>;

export interface HomeApi {
  getHomeSummary: GetHomeSummary;
  startWorkout: StartWorkout;
}
