/** Resultado e erros das funções de dados (todas seguem `{ data, error }`, como o supabase-js). */
import { isPlanFeature, type PlanFeature } from "@guf/core";

export type ApiErrorCode =
  | "workout_in_progress"
  | "workout_not_found"
  | "project_not_found"
  | "project_locked"
  | "routine_empty"
  | "routine_not_found"
  | "session_not_found"
  | "workout_empty"
  | "exercise_not_found"
  | "handle_taken"
  | "handle_invalid"
  | "person_not_found"
  | "follow_limit"
  | "history_hidden"
  | "ai_daily_limit"
  | "ai_message_invalid"
  | "ai_unavailable"
  | "plan_limit"
  | "billing_unavailable"
  | "not_authenticated"
  | "network_error"
  | "unknown";

export interface ApiError {
  code: ApiErrorCode;
  /** Mensagem pronta para o usuário: diz o que aconteceu e como resolver. */
  message: string;
  /** Em `plan_limit`: a funcionalidade do plano que barrou (a tela do Pro mostra o texto dela). */
  feature?: PlanFeature;
}

/** Mesmo formato do supabase-js: sucesso com `data` ou falha com `error`, nunca os dois. */
export type ApiResult<T> = { data: T; error: null } | { data: null; error: ApiError };

export const API_ERROR_MESSAGES: Record<ApiErrorCode, string> = {
  workout_in_progress: "Você já tem um treino em andamento. Retome ou finalize esse treino antes de começar outro.",
  workout_not_found: "Este treino já foi finalizado ou não está mais disponível. Volte para a Início.",
  project_not_found: "Este projeto não existe mais ou está arquivado. Atualize a lista e tente de novo.",
  project_locked: "O projeto Favoritos é fixo: não dá para renomear, arquivar nem excluir.",
  routine_empty: "Adicione pelo menos 1 exercício para salvar a rotina.",
  routine_not_found: "Esta rotina não existe mais ou está arquivada. Volte para Projetos e tente de novo.",
  session_not_found: "Este treino foi excluído ou não está mais disponível. Volte e escolha outro.",
  workout_empty: "O treino precisa de pelo menos uma série concluída. Para apagar o treino inteiro, use \"Excluir treino\" no resumo.",
  exercise_not_found: "Este exercício não está mais disponível. Volte e escolha outro.",
  handle_taken: "Esse nome de usuário já está em uso. Escolha outro.",
  handle_invalid: "Use de 3 a 20 caracteres: letras minúsculas, números, ponto ou _ (sem começar ou terminar com ponto ou _).",
  person_not_found: "Não encontramos essa pessoa. Confira o nome de usuário ou peça um novo link.",
  follow_limit: "Você atingiu o limite de pedidos para seguir de hoje. Tente de novo amanhã.",
  history_hidden: "Esta pessoa ocultou o histórico de treinos. As estatísticas e a pontuação continuam visíveis.",
  ai_daily_limit: "Você chegou ao limite de perguntas ao GUF AI nas últimas 24 horas. Tente de novo mais tarde.",
  ai_message_invalid: "Mensagem muito longa. Escreva até 2.000 caracteres e envie de novo.",
  ai_unavailable: "O GUF AI não conseguiu responder agora. Tente de novo em instantes.",
  plan_limit: "Isso não está incluído no seu plano. Veja os planos para continuar.",
  billing_unavailable: "As assinaturas ainda não estão disponíveis. Avisaremos quando o Pro puder ser assinado.",
  not_authenticated: "Sua sessão expirou. Entre de novo para continuar.",
  network_error: "Sem conexão. Verifique a internet e tente de novo.",
  unknown: "Não foi possível carregar agora. Tente de novo em instantes.",
};

export function apiError(code: ApiErrorCode): ApiError {
  return { code, message: API_ERROR_MESSAGES[code] };
}

/** Limite do plano; o banco manda a funcionalidade no `hint` do erro GL001. */
function planLimitError(hint: string | undefined): ApiError {
  const error = apiError("plan_limit");
  return hint && isPlanFeature(hint) ? { ...error, feature: hint } : error;
}

/** Erro de rede (sem conexão / servidor inalcançável) — a fila offline reenvia depois. */
export function isNetworkError(error: ApiError | null | undefined): boolean {
  return error?.code === "network_error";
}

/** Códigos próprios do módulo social e da competição (migration social_competition). */
const SOCIAL_ERROR_CODES: Record<string, ApiErrorCode> = {
  GS002: "handle_taken",
  GS004: "person_not_found",
  GS005: "follow_limit",
  GS006: "history_hidden",
  GS008: "handle_invalid",
  GS009: "session_not_found", // get_member_workout: inexistente OU sem permissão (mesma resposta de propósito)
};

/** Converte erros do PostgREST/rede no ApiError do app. */
export function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object") {
    const { code, message, hint } = error as { code?: string; message?: string; hint?: string };
    if (code === "GL001") return planLimitError(hint); // gatilhos de limite do plano (projects, routines)
    if (code === "23505") return apiError("workout_in_progress"); // índice único: 1 treino em andamento
    if (code === "P0002") return apiError("workout_not_found"); // "Treino em andamento não encontrado"
    if (code === "GP001") return apiError("project_not_found"); // activate_project, save_routine
    if (code === "GP002") return apiError("project_locked"); // Favoritos protegido
    if (code === "GP003") return apiError("routine_empty"); // save_routine sem exercícios
    if (code === "GP004") return apiError("routine_not_found"); // save_routine
    if (code === "GW001") return apiError("session_not_found"); // save_workout_edit: treino concluído inexistente
    if (code === "GW002") return apiError("workout_empty"); // save_workout_edit sem séries concluídas
    if (code === "GW003") return apiError("exercise_not_found"); // save_workout_edit
    const socialCode = SOCIAL_ERROR_CODES[code ?? ""];
    if (socialCode) return apiError(socialCode);
    if (code === "PGRST301" || code === "42501") return apiError("not_authenticated");
    if (typeof message === "string" && /fetch|network|load failed/i.test(message)) return apiError("network_error");
  }
  if (error instanceof TypeError) return apiError("network_error");
  return apiError("unknown");
}
