import { withDevState } from "@/shared/helpers/dev-state-path";

/** Editar um treino concluído (site estático: rota fixa + query string; em dev leva o ?estado=). */
export const workoutEditPath = (sessionId: string) => withDevState(`/treino/editar?id=${encodeURIComponent(sessionId)}`);
