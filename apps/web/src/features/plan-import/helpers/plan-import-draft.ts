import type { LibraryExercise, PlanImportDraft, PlanImportMatch } from "@guf/api";

/** Edições da revisão: nada vai para o banco até "Criar". */
export type PlanImportDraftAction =
  | { type: "renameProject"; name: string }
  | { type: "renameRoutine"; routineKey: string; name: string }
  | { type: "removeRoutine"; routineKey: string }
  | { type: "removeExercise"; routineKey: string; exerciseKey: string }
  | { type: "replaceExercise"; routineKey: string; exerciseKey: string; exercise: LibraryExercise };

/** Exercício escolhido no seletor → vínculo do rascunho (do catálogo do guf ou próprio da pessoa). */
export function toLibraryMatch(exercise: LibraryExercise): PlanImportMatch {
  const base = { exerciseId: exercise.id, name: exercise.name, muscleGroup: exercise.muscleGroup };
  return exercise.isCustom ? { kind: "own", ...base } : { kind: "catalog", ...base };
}

function updateRoutine(draft: PlanImportDraft, routineKey: string, update: (routine: PlanImportDraft["routines"][number]) => PlanImportDraft["routines"][number]): PlanImportDraft {
  return { ...draft, routines: draft.routines.map((routine) => (routine.key === routineKey ? update(routine) : routine)) };
}

export function planImportDraftReducer(draft: PlanImportDraft, action: PlanImportDraftAction): PlanImportDraft {
  switch (action.type) {
    case "renameProject":
      return { ...draft, projectName: action.name };
    case "renameRoutine":
      return updateRoutine(draft, action.routineKey, (routine) => ({ ...routine, name: action.name }));
    case "removeRoutine":
      return { ...draft, routines: draft.routines.filter((routine) => routine.key !== action.routineKey) };
    case "removeExercise":
      return updateRoutine(draft, action.routineKey, (routine) => ({
        ...routine,
        exercises: routine.exercises.filter((exercise) => exercise.key !== action.exerciseKey),
      }));
    case "replaceExercise":
      // Troca só o exercício: séries, repetições, descanso e observação da ficha continuam.
      return updateRoutine(draft, action.routineKey, (routine) => ({
        ...routine,
        exercises: routine.exercises.map((exercise) =>
          exercise.key === action.exerciseKey ? { ...exercise, match: toLibraryMatch(action.exercise) } : exercise,
        ),
      }));
  }
}

/** Ids dos exercícios existentes já usados na rotina ("Já adicionado" no seletor). */
export function routineExerciseIds(routine: PlanImportDraft["routines"][number]): string[] {
  return routine.exercises.flatMap((exercise) => (exercise.match.kind === "new" ? [] : [exercise.match.exerciseId]));
}
