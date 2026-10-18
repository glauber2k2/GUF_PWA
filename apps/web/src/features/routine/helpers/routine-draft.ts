import { NEW_PLANNED_EXERCISE, toggleWeekday, type IsoWeekday } from "@guf/core";
import type { LibraryExercise, RoutineDraft, RoutineExerciseDraft } from "@guf/api";

/** Rascunho da rotina na tela: só é gravado ao tocar em "Salvar". */
export type DraftAction =
  | { type: "setName"; name: string }
  | { type: "setProject"; projectId: string }
  | { type: "toggleDay"; day: IsoWeekday }
  /** Já convertidos com toPlannedExercise (o id é gerado fora do reducer, que precisa ser puro). */
  | { type: "addExercises"; exercises: RoutineExerciseDraft[] }
  | { type: "replaceExercise"; id: string; exercise: LibraryExercise }
  | { type: "updateExercise"; id: string; patch: Partial<Pick<RoutineExerciseDraft, "targetSets" | "targetReps" | "restSeconds" | "notes">> }
  | { type: "removeExercise"; id: string }
  | { type: "restoreExercise"; index: number; exercise: RoutineExerciseDraft }
  | { type: "reorder"; exercises: RoutineExerciseDraft[] };

/** Exercício da biblioteca → planejado (id novo gerado no app; padrões 3 × 10, 90 s). */
export function toPlannedExercise(library: LibraryExercise): RoutineExerciseDraft {
  return {
    id: crypto.randomUUID(),
    exerciseId: library.id,
    name: library.name,
    muscleGroup: library.muscleGroup,
    equipment: library.equipment,
    ...NEW_PLANNED_EXERCISE,
  };
}

export function draftReducer(draft: RoutineDraft, action: DraftAction): RoutineDraft {
  const mapExercise = (id: string, fn: (e: RoutineExerciseDraft) => RoutineExerciseDraft) => ({
    ...draft,
    exercises: draft.exercises.map((e) => (e.id === id ? fn(e) : e)),
  });
  switch (action.type) {
    case "setName":
      return { ...draft, name: action.name };
    case "setProject":
      return { ...draft, projectId: action.projectId };
    case "toggleDay":
      return { ...draft, weekdays: toggleWeekday(draft.weekdays, action.day) };
    case "addExercises":
      return { ...draft, exercises: [...draft.exercises, ...action.exercises] };
    case "replaceExercise":
      // Trocar mantém séries, repetições, descanso e observação.
      return mapExercise(action.id, (e) => ({
        ...e,
        exerciseId: action.exercise.id,
        name: action.exercise.name,
        muscleGroup: action.exercise.muscleGroup,
        equipment: action.exercise.equipment,
      }));
    case "updateExercise":
      return mapExercise(action.id, (e) => ({ ...e, ...action.patch }));
    case "removeExercise":
      return { ...draft, exercises: draft.exercises.filter((e) => e.id !== action.id) };
    case "restoreExercise": {
      const exercises = draft.exercises.slice();
      exercises.splice(action.index, 0, action.exercise);
      return { ...draft, exercises };
    }
    case "reorder":
      return { ...draft, exercises: action.exercises };
  }
}

/** Houve mudança em relação ao que está salvo? (pergunta antes de sair sem salvar) */
export function isDraftDirty(saved: RoutineDraft, current: RoutineDraft): boolean {
  return JSON.stringify(saved) !== JSON.stringify(current);
}
