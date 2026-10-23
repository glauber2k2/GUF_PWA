/**
 * Valores de `data-tour` dos elementos destacados no tour. Quem marca o elemento importa daqui
 * (pelo barrel), para o passo e o elemento nunca ficarem com nomes diferentes.
 */
export const TOUR_TARGETS = {
  editProfile: "edit-profile",
  aiAssistant: "ai-assistant",
  planImport: "plan-import",
  todayCard: "today-card",
  weekCard: "week-card",
  streakCard: "streak-card",
  calendar: "calendar",
  evolution: "evolution",
  history: "history",
  projectsTab: "nav-projects",
  newProject: "new-project",
  activeProject: "active-project",
  trainTab: "nav-train",
  competeTab: "nav-compete",
  competitionFilters: "competition-filters",
  competitionRules: "competition-rules",
  inviteFriends: "invite-friends",
  peopleSearch: "people-search",
  profileTab: "nav-profile",
  workoutStage: "workout-stage",
  workoutHeader: "workout-header",
  workoutAddExercise: "workout-add-exercise",
  workoutFinish: "workout-finish",
} as const;

type Found = Element | Element[] | null;

const byTarget = (value: string) => (): Found => document.querySelector(`[data-tour="${value}"]`);

/**
 * Peças internas do card de exercício na demonstração do treino (`WorkoutTourStage`). O card é o
 * componente real da tela de treino; em vez de espalhar atributos do tour por ele, os elementos são
 * achados pelos rótulos acessíveis, que já são estáveis (SetRow e WorkoutExerciseCard).
 */
function inStage(selector: string): Element[] {
  return Array.from(document.querySelectorAll(`[data-tour="${TOUR_TARGETS.workoutStage}"] ${selector}`));
}

function stageButtonWithText(text: string): Element | null {
  return inStage("button").find((button) => button.textContent?.trim() === text) ?? null;
}

/** Como achar cada alvo. Um alvo pode ser vários elementos: o destaque cobre todos. */
export const TOUR_TARGET_FINDERS = {
  editProfile: byTarget(TOUR_TARGETS.editProfile),
  aiAssistant: byTarget(TOUR_TARGETS.aiAssistant),
  planImport: byTarget(TOUR_TARGETS.planImport),
  todayCard: byTarget(TOUR_TARGETS.todayCard),
  weekCard: byTarget(TOUR_TARGETS.weekCard),
  streakCard: byTarget(TOUR_TARGETS.streakCard),
  calendar: byTarget(TOUR_TARGETS.calendar),
  evolution: byTarget(TOUR_TARGETS.evolution),
  history: byTarget(TOUR_TARGETS.history),
  projectsTab: byTarget(TOUR_TARGETS.projectsTab),
  newProject: byTarget(TOUR_TARGETS.newProject),
  activeProject: byTarget(TOUR_TARGETS.activeProject),
  trainTab: byTarget(TOUR_TARGETS.trainTab),
  competeTab: byTarget(TOUR_TARGETS.competeTab),
  competitionFilters: byTarget(TOUR_TARGETS.competitionFilters),
  competitionRules: byTarget(TOUR_TARGETS.competitionRules),
  inviteFriends: byTarget(TOUR_TARGETS.inviteFriends),
  peopleSearch: byTarget(TOUR_TARGETS.peopleSearch),
  profileTab: byTarget(TOUR_TARGETS.profileTab),
  workoutHeader: byTarget(TOUR_TARGETS.workoutHeader),
  workoutAddExercise: byTarget(TOUR_TARGETS.workoutAddExercise),
  workoutFinish: byTarget(TOUR_TARGETS.workoutFinish),
  exerciseHeader: (): Found => inStage("article button[aria-expanded]")[0] ?? null,
  setRow: (): Found => inStage('[aria-label="Carga"]')[0]?.parentElement ?? null,
  setLoadAndReps: (): Found => {
    const cells = [inStage('[aria-label="Carga"]')[0], inStage('[aria-label="Repetições"]')[0]].filter((cell) => cell !== undefined);
    return cells.length > 0 ? cells : null;
  },
  setDone: (): Found => inStage('[aria-label="Concluir série 2"]')[0] ?? null,
  setType: (): Found => inStage('[aria-label^="Tipo:"]')[0] ?? null,
  secondSetRow: (): Found => inStage('[aria-label="Carga"]')[1]?.parentElement ?? null,
  addSet: (): Found => stageButtonWithText("Adicionar série"),
  exerciseMenu: (): Found => inStage('[aria-label^="Opções de"]')[0] ?? null,
} satisfies Record<string, () => Found>;

export type TourTargetId = keyof typeof TOUR_TARGET_FINDERS;
