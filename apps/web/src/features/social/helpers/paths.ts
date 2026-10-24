import { withDevState } from "@/shared/helpers/dev-state-path";

/** Tela "Solicitações para seguir" (aberta pela barra do seu perfil privado). */
export const FOLLOW_REQUESTS_PATH = "/solicitacoes";

/** Rota do treino de outra pessoa (rota fixa + query string). */
export const MEMBER_WORKOUT_ROUTE = "/pessoa/treino";

/** Treino concluído de outra pessoa, aberto pelo histórico do perfil dela. */
export const memberWorkoutPath = (sessionId: string) => withDevState(`${MEMBER_WORKOUT_ROUTE}?id=${encodeURIComponent(sessionId)}`);

/** Rota da tela "Editar perfil" (imersiva). */
export const EDIT_PROFILE_ROUTE = "/perfil/editar";

/** "Editar perfil" (leva o ?estado= junto em dev). */
export const editProfilePath = () => withDevState(EDIT_PROFILE_ROUTE);
