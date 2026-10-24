import type { ActiveWorkout, WorkoutExercise, WorkoutSet } from "@guf/api";
import { pickSetValues, setMetricFor, type SetField, type SetType } from "@guf/core";

/** Exercício do treino com o estado de tela (aberto/recolhido, destaque de recém-adicionado). */
export interface ExerciseView extends WorkoutExercise {
  open: boolean;
  /** Destaque volt ao entrar (adicionado, trocado ou desfeito). */
  flash: boolean;
}

export interface WorkoutViewState {
  exercises: ExerciseView[];
  note: string | null;
}

/** Medida da série aberta na folha de edição (carga/repetições ou distância/tempo). */
export type EditableField = SetField;

export type WorkoutAction =
  | { type: "toggleSet"; exerciseId: string; setIndex: number }
  | { type: "cycleSetType"; exerciseId: string; setIndex: number }
  | { type: "setField"; exerciseId: string; setIndex: number; field: EditableField; value: number }
  | { type: "addSet"; exerciseId: string; set: WorkoutSet }
  | { type: "replaceSet"; exerciseId: string; setIndex: number; set: WorkoutSet }
  | { type: "removeSet"; exerciseId: string; setIndex: number }
  | { type: "restoreSet"; exerciseId: string; setIndex: number; set: WorkoutSet }
  | { type: "toggleOpen"; exerciseId: string }
  | { type: "removeExercise"; exerciseId: string }
  | { type: "restoreExercise"; index: number; exercise: ExerciseView }
  | { type: "reorderExercises"; exerciseIds: string[] }
  | { type: "addExercises"; exercises: WorkoutExercise[] }
  | { type: "replaceExercise"; exerciseId: string; exercise: WorkoutExercise }
  | { type: "setExerciseNote"; exerciseId: string; note: string }
  | { type: "setWorkoutNote"; note: string }
  | { type: "startEmpty" }
  | { type: "clearFlash" };

/** Ciclo do tipo de série ao tocar no número: normal → aquecimento → drop set → falha. */
const SET_TYPE_CYCLE: SetType[] = ["normal", "warmup", "dropset", "failure"];

export function initWorkoutView(workout: Pick<ActiveWorkout, "note" | "exercises">): WorkoutViewState {
  return {
    note: workout.note,
    exercises: workout.exercises.map((e) => ({ ...e, open: true, flash: false })),
  };
}

const renumber = (sets: WorkoutSet[]) => sets.map((s, i) => ({ ...s, setNumber: i + 1 }));

function mapExercise(state: WorkoutViewState, id: string, fn: (e: ExerciseView) => ExerciseView): WorkoutViewState {
  return { ...state, exercises: state.exercises.map((e) => (e.id === id ? fn(e) : e)) };
}

function mapSet(e: ExerciseView, index: number, fn: (s: WorkoutSet) => WorkoutSet): ExerciseView {
  return { ...e, sets: e.sets.map((s, i) => (i === index ? fn(s) : s)) };
}

export function workoutReducer(state: WorkoutViewState, action: WorkoutAction): WorkoutViewState {
  switch (action.type) {
    case "toggleSet":
      return mapExercise(state, action.exerciseId, (e) =>
        mapSet(e, action.setIndex, (s) => ({ ...s, isCompleted: !s.isCompleted })),
      );
    case "cycleSetType":
      return mapExercise(state, action.exerciseId, (e) =>
        mapSet(e, action.setIndex, (s) => ({
          ...s,
          setType: SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(s.setType) + 1) % SET_TYPE_CYCLE.length] ?? "normal",
        })),
      );
    case "setField":
      return mapExercise(state, action.exerciseId, (e) =>
        mapSet(e, action.setIndex, (s) => ({ ...s, [action.field]: Math.max(0, action.value) })),
      );
    case "addSet":
      return mapExercise(state, action.exerciseId, (e) => ({ ...e, sets: renumber([...e.sets, action.set]) }));
    case "replaceSet":
      return mapExercise(state, action.exerciseId, (e) => mapSet(e, action.setIndex, () => action.set));
    case "removeSet":
      return mapExercise(state, action.exerciseId, (e) => ({
        ...e,
        sets: renumber(e.sets.filter((_, i) => i !== action.setIndex)),
      }));
    case "restoreSet":
      return mapExercise(state, action.exerciseId, (e) => {
        const sets = [...e.sets];
        sets.splice(action.setIndex, 0, action.set);
        return { ...e, sets: renumber(sets) };
      });
    case "toggleOpen":
      return mapExercise(state, action.exerciseId, (e) => ({ ...e, open: !e.open }));
    case "removeExercise":
      return { ...state, exercises: state.exercises.filter((e) => e.id !== action.exerciseId) };
    case "restoreExercise": {
      const exercises = [...state.exercises];
      exercises.splice(action.index, 0, { ...action.exercise, flash: true });
      return { ...state, exercises };
    }
    case "reorderExercises": {
      const rank = new Map(action.exerciseIds.map((id, i) => [id, i]));
      // Quem não veio na lista (não deveria acontecer) fica no fim, na ordem atual.
      const at = (e: ExerciseView) => rank.get(e.id) ?? Number.MAX_SAFE_INTEGER;
      return { ...state, exercises: [...state.exercises].sort((a, b) => at(a) - at(b)) };
    }
    case "addExercises":
      return {
        ...state,
        exercises: [...state.exercises, ...action.exercises.map((e) => ({ ...e, open: true, flash: true }))],
      };
    case "replaceExercise":
      return mapExercise(state, action.exerciseId, (e) => ({ ...action.exercise, open: e.open, flash: true }));
    case "setExerciseNote":
      return mapExercise(state, action.exerciseId, (e) => ({ ...e, note: action.note || null }));
    case "setWorkoutNote":
      return { ...state, note: action.note || null };
    case "startEmpty":
      return { ...state, exercises: [] };
    case "clearFlash":
      return { ...state, exercises: state.exercises.map((e) => (e.flash ? { ...e, flash: false } : e)) };
  }
}

/** Nova série no fim do exercício, copiando as medidas da última (sem nenhuma, os padrões do tipo). */
export function newSetFrom(exercise: WorkoutExercise): WorkoutSet {
  const last = exercise.sets[exercise.sets.length - 1];
  const values = last ? pickSetValues(last) : pickSetValues(setMetricFor(exercise.muscleGroup).defaults);
  return {
    id: crypto.randomUUID(),
    setNumber: exercise.sets.length + 1,
    setType: "normal",
    ...values,
    isCompleted: false,
    previous: null,
  };
}
