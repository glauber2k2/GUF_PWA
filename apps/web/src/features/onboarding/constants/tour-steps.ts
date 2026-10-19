import type { GufRatOccasion } from "@/shared/components/ds";

/**
 * Valores de `data-tour` dos elementos destacados no tour. Quem marca o elemento importa daqui,
 * para o passo e o elemento nunca ficarem com nomes diferentes.
 */
export const TOUR_TARGETS = {
  projectsTab: "nav-projects",
  newProject: "new-project",
  trainTab: "nav-train",
  history: "history",
} as const;

export type TourTarget = (typeof TOUR_TARGETS)[keyof typeof TOUR_TARGETS];

export interface TourStep {
  id: string;
  /** Rota onde o passo aparece (sem barra no fim; o tour navega até ela). */
  route: string;
  /** Elemento destacado; sem alvo, o card aparece no centro (boas-vindas, explicações gerais). */
  target?: TourTarget;
  title: string;
  body: string;
  rat?: GufRatOccasion;
}

/** Tour da primeira entrada: projetos → rotinas → iniciar treino → registrar série → histórico. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "welcome",
    route: "/",
    title: "Bem-vindo ao guf",
    body: "Em menos de 1 minuto você aprende a montar seus treinos e registrar cada série.",
    rat: "welcome",
  },
  {
    id: "projects",
    route: "/",
    target: TOUR_TARGETS.projectsTab,
    title: "Projetos e rotinas",
    body: "Em Projetos você agrupa suas rotinas, como Treino A, B e C. O projeto ativo define o treino de cada dia.",
    rat: "tip",
  },
  {
    id: "new-project",
    route: "/projetos",
    target: TOUR_TARGETS.newProject,
    title: "Monte seu plano",
    body: "Crie um projeto e adicione rotinas com exercícios, séries, repetições e descanso.",
    rat: "thinking",
  },
  {
    id: "start-workout",
    route: "/",
    target: TOUR_TARGETS.trainTab,
    title: "Hora de treinar",
    body: "Toque em Treinar para começar uma rotina ou um treino livre. A Início também sugere o treino do dia.",
    rat: "warmup",
  },
  {
    id: "log-set",
    route: "/",
    title: "Registre cada série",
    body: "No treino, ajuste carga e repetições e toque no botão de concluir ao lado da série. O descanso começa sozinho e tudo funciona sem internet.",
    rat: "lift",
  },
  {
    id: "history",
    route: "/",
    target: TOUR_TARGETS.history,
    title: "Acompanhe sua evolução",
    body: "Aqui ficam sua sequência de semanas, o calendário e a evolução de carga e recordes de cada exercício.",
    rat: "goalReached",
  },
];
