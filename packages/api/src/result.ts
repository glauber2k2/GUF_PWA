/** Resultado e erros das funções de dados (todas seguem `{ data, error }`, como o supabase-js). */
import { isPlanFeature, PRIVACY_CONTACT_EMAIL, type PlanFeature } from "@guf/core";
import { ACCOUNT_SUSPENDED_DB_CODE } from "./account-suspension";

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
  | "avatar_upload_failed"
  | "history_hidden"
  | "ai_daily_limit"
  | "ai_message_invalid"
  | "ai_unavailable"
  | "plan_import_invalid"
  | "plan_import_empty"
  | "plan_limit"
  | "billing_unavailable"
  | "billing_provider_error"
  | "subscription_not_found"
  | "subscription_already_active"
  | "subscription_documents_outdated"
  | "health_consent_required"
  | "measurement_date_invalid"
  | "measurement_invalid"
  | "staff_not_member"
  | "staff_mfa_required"
  | "staff_forbidden"
  | "account_not_found"
  | "plan_subscription_locked"
  | "only_login_method"
  | "announcement_not_found"
  | "announcement_invalid"
  | "announcement_health_product"
  | "staff_change_blocked"
  | "reason_required"
  | "nothing_changed"
  | "staff_already_member"
  | "account_is_staff"
  | "account_has_files"
  | "date_in_past"
  | "account_banned"
  | "account_without_email"
  | "catalog_exercise_invalid"
  | "catalog_exercise_not_found"
  | "catalog_exercise_duplicate"
  | "catalog_exercise_metric_locked"
  | "password_reset_rate_limited"
  | "password_reset_unavailable"
  | "mfa_code_invalid"
  | "invalid_credentials"
  | "account_suspended"
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
  avatar_upload_failed: "Não foi possível enviar a foto. Use uma imagem JPG ou PNG, confira a internet e tente de novo.",
  history_hidden: "Esta pessoa ocultou o histórico de treinos. As estatísticas e a pontuação continuam visíveis.",
  ai_daily_limit: "Você chegou ao limite de perguntas ao GUF AI nas últimas 24 horas. Tente de novo mais tarde.",
  ai_message_invalid: "Mensagem muito longa. Escreva até 2.000 caracteres e envie de novo.",
  ai_unavailable: "O GUF AI não conseguiu responder agora. Tente de novo em instantes.",
  plan_import_invalid: "Não foi possível ler essa ficha. Confira o texto (até 6.000 caracteres) e tente de novo.",
  plan_import_empty: "Não encontramos exercícios nesse texto. Cole a ficha com o nome dos exercícios, séries e repetições.",
  plan_limit: "Isso não está incluído no seu plano. Veja os planos para continuar.",
  billing_unavailable: "As assinaturas ainda não estão disponíveis. Avisaremos quando o Pro puder ser assinado.",
  billing_provider_error: "O sistema de pagamento não respondeu. Nada foi cobrado: tente de novo em alguns minutos.",
  subscription_not_found: "Não encontramos essa assinatura ativa. Atualize a tela e confira a situação do seu plano.",
  subscription_already_active: "Você já tem uma assinatura ativa. Gerencie em Configurações › Plano.",
  subscription_documents_outdated: "Os termos foram atualizados. Recarregue a tela, leia e aceite de novo para assinar.",
  health_consent_required: "Para registrar medidas, autorize o uso dos dados de saúde em Perfil › Medidas corporais.",
  measurement_date_invalid: "Escolha hoje ou um dia que já passou para a medição.",
  measurement_invalid: "Confira as medidas: use centímetros, de 0,1 a 299,9 (ex.: 38,5).",
  staff_not_member: "Sua conta não tem acesso ao painel. Peça para uma pessoa administradora liberar seu e-mail da equipe.",
  staff_mfa_required: "Confirme o segundo fator para continuar. Entre de novo e digite o código do aplicativo autenticador.",
  staff_forbidden: "Seu papel não permite esta ação. Peça para uma pessoa administradora.",
  account_not_found: "Essa conta não existe mais ou foi excluída. Volte para a busca.",
  plan_subscription_locked: "Esta pessoa tem uma assinatura paga ativa. O plano muda pelo cancelamento da assinatura, não pelo painel.",
  only_login_method: "Esse é o único jeito de a pessoa entrar. Peça para ela criar uma senha antes de desvincular.",
  announcement_not_found: "Esse comunicado não existe mais ou já foi publicado. Atualize a lista.",
  announcement_invalid: "Confira o comunicado: título, texto, público e o fim (no futuro) são obrigatórios para publicar.",
  announcement_health_product: "Com a regra de consentimento de saúde, use a finalidade Serviço ou Legal.",
  staff_change_blocked: "Não é possível mudar o próprio acesso nem deixar a equipe sem nenhuma pessoa admin.",
  reason_required: "Escolha um motivo (em \"Outro\", descreva em até 200 caracteres). Ele fica registrado na auditoria.",
  nothing_changed: "Nada mudou: o valor novo é igual ao atual.",
  staff_already_member: "Essa pessoa já faz parte da equipe.",
  account_is_staff: "Essa conta é sua ou de alguém da equipe. Tire o acesso dela em Equipe antes de suspender ou excluir.",
  account_has_files: "Essa conta tem foto guardada no aplicativo. Peça para a pessoa excluir a conta pelo app (Configurações › Privacidade).",
  date_in_past: "Escolha uma data e um horário no futuro.",
  account_banned: "Essa conta está suspensa: o link não funcionaria. Encerre a suspensão antes de redefinir a senha.",
  account_without_email: "Essa conta não tem e-mail para receber o link. A pessoa precisa entrar pelo login social.",
  catalog_exercise_invalid: "Confira os exercícios: nome com 1 a 100 caracteres, grupo muscular e equipamento válidos, de 1 a 500 por vez.",
  catalog_exercise_not_found: "Esse exercício não está mais no catálogo (foi excluído ou arquivado). Atualize a lista.",
  catalog_exercise_duplicate: "Já existe um exercício com esse nome no catálogo. Use outro nome.",
  catalog_exercise_metric_locked: "Esse exercício já foi usado: não dá para trocar entre cardio e força (as séries guardam medidas diferentes). Cadastre um exercício novo.",
  password_reset_rate_limited: "Muitos e-mails de senha enviados em pouco tempo. Espere alguns minutos e tente de novo.",
  password_reset_unavailable: "A redefinição de senha ainda não está configurada no servidor (APP_URL). Fale com quem administra o guf.",
  invalid_credentials: "E-mail ou senha não conferem. Confira os dois campos e tente de novo.",
  mfa_code_invalid: "Código incorreto ou vencido. Digite o código que aparece agora no aplicativo.",
  account_suspended: `Sua conta está suspensa pela equipe do guf. Para saber o motivo ou contestar, escreva para ${PRIVACY_CONTACT_EMAIL}.`,
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
/** Códigos do painel de administração (migration admin_panel). */
const ADMIN_ERROR_CODES: Record<string, ApiErrorCode> = {
  GA001: "staff_not_member",
  GA002: "staff_mfa_required",
  GA003: "staff_forbidden",
  GA004: "account_not_found",
  GA005: "plan_subscription_locked",
  GA006: "only_login_method",
  GA007: "announcement_not_found",
  GA008: "announcement_invalid",
  GA009: "announcement_health_product",
  GA010: "staff_change_blocked",
  GA011: "reason_required",
  GA012: "nothing_changed",
  GA013: "staff_already_member",
  GA014: "account_is_staff",
  GA015: "account_has_files",
  GA016: "date_in_past",
  GA017: "account_banned",
  GA018: "account_without_email",
  GA019: "catalog_exercise_invalid",
  GA020: "catalog_exercise_not_found",
  GA021: "catalog_exercise_duplicate",
  GA022: "catalog_exercise_metric_locked",
};

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
    if (code === ACCOUNT_SUSPENDED_DB_CODE) return apiError("account_suspended"); // middleware guard_suspended_account
    if (code === "GL001") return planLimitError(hint); // gatilhos de limite do plano (projects, routines)
    if (code === "23505") return apiError("workout_in_progress"); // índice único: 1 treino em andamento
    if (code === "P0002") return apiError("workout_not_found"); // "Treino em andamento não encontrado"
    if (code === "GP001") return apiError("project_not_found"); // activate_project, save_routine
    if (code === "GP002") return apiError("project_locked"); // Favoritos protegido
    if (code === "GP003") return apiError("routine_empty"); // save_routine sem exercícios
    if (code === "GP004") return apiError("routine_not_found"); // save_routine
    if (code === "GE001") return apiError("exercise_not_found"); // gatilho: exercício de outra pessoa na rotina ou no treino
    if (code === "GW001") return apiError("session_not_found"); // save_workout_edit: treino concluído inexistente
    if (code === "GW002") return apiError("workout_empty"); // save_workout_edit sem séries concluídas
    if (code === "GW003") return apiError("exercise_not_found"); // save_workout_edit
    if (code === "GI001") return apiError("exercise_not_found"); // import_training_plan: nem do catálogo do guf nem da pessoa
    if (code === "GI002") return apiError("plan_import_invalid"); // import_training_plan: ficha fora dos limites
    if (code === "GM001") return apiError("health_consent_required"); // save_body_measurement sem o consentimento vigente
    if (code === "GM002") return apiError("measurement_date_invalid"); // save_body_measurement: data futura ou muito antiga
    if (code === "GM003") return apiError("measurement_invalid"); // save_body_measurement: local ou valor fora dos limites
    const adminCode = ADMIN_ERROR_CODES[code ?? ""];
    if (adminCode) return apiError(adminCode);
    const socialCode = SOCIAL_ERROR_CODES[code ?? ""];
    if (socialCode) return apiError(socialCode);
    if (code === "PGRST301" || code === "42501") return apiError("not_authenticated");
    if (typeof message === "string" && /fetch|network|load failed/i.test(message)) return apiError("network_error");
  }
  if (error instanceof TypeError) return apiError("network_error");
  return apiError("unknown");
}
