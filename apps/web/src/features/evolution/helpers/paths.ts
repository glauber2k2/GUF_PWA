import { withDevState } from "@/shared/helpers/dev-state-path";

/** Rotas do Resumo e da Evolução (site estático: rota fixa + query string). */
export const summaryPath = (sessionId: string) => withDevState(`/treino/resumo?id=${encodeURIComponent(sessionId)}`);
export const exercisePath = (exerciseId: string) => withDevState(`/exercicio?id=${encodeURIComponent(exerciseId)}`);
export const exerciseSearchPath = () => withDevState("/exercicio/busca");
