/**
 * Folha "Iniciar treino" (Claude Design "Iniciar Treino" · alternativa 2): qual rotina é a próxima e
 * quantos músculos aparecem ao abrir a rotina. Puras, sem React.
 */
import { todayPlan, type ScheduledRoutine } from "./schedule";

/** Grupos que aparecem como selo ao abrir a rotina (o resto fica na lista de exercícios). */
export const START_SHEET_MAX_MUSCLES = 4;

/**
 * Rotina destacada como "Próximo": o treino de hoje (pelos dias da semana) ou o seguinte na ordem;
 * null em dia de descanso ou quando você já treinou hoje.
 * @param lastFinishedRoutineId última rotina concluída (para seguir a ordem)
 */
export function nextRoutineId(routines: readonly ScheduledRoutine[], lastFinishedRoutineId: string | null, today: Date, hasTrainedToday: boolean): string | null {
  if (hasTrainedToday) return null;
  const plan = todayPlan(routines, lastFinishedRoutineId, today);
  return plan.kind === "scheduled" || plan.kind === "sequence" ? plan.routine.id : null;
}

