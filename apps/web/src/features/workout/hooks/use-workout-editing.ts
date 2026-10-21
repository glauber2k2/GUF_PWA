"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { ArrowLeftRight, NotepadText, Plus, Trash2 } from "lucide-react";
import type { ActiveWorkout, ExerciseContext, LibraryExercise, WorkoutExercise, WorkoutSet } from "@guf/api";
import { markRecordSets, setMetricFor, SET_METRICS, type WeightUnit } from "@guf/core";
import type { ToastOptions } from "@/features/app-shell";
import { buildWorkoutExercise } from "@/features/workout/helpers/workout-builders";
import {
  initWorkoutView,
  newSetFrom,
  workoutReducer,
  type EditableField,
  type ExerciseView,
} from "@/features/workout/helpers/workout-state";

const FLASH_MS = 1300;
const SET_LETTER: Record<string, string> = { warmup: "A", dropset: "D", failure: "F" };

/**
 * Para onde vai cada alteração feita na tela. O treino em andamento grava na fila offline;
 * a edição de um treino concluído não grava nada aqui (salva tudo de uma vez no fim).
 */
export interface WorkoutChangeSink {
  saveSet: (exerciseId: string, set: WorkoutSet) => void;
  deleteSet: (setId: string) => void;
  removeExercise: (exerciseId: string) => void;
  replaceExercise: (oldExerciseId: string, exercise: WorkoutExercise, position: number) => void;
  addExercises: (exercises: WorkoutExercise[], firstPosition: number) => void;
  reorderExercises: (exerciseIds: string[]) => void;
  saveExerciseNote: (exerciseId: string, note: string) => void;
  saveWorkoutNote: (note: string) => void;
}

/** Célula da série aberta na folha de edição (carga/repetições ou distância/tempo). */
export interface SetEditTarget {
  exerciseId: string;
  setIndex: number;
  field: EditableField;
}

/** Folhas da edição: menu de um exercício ou observação (de um exercício ou do treino). */
export type EditingSheet = { kind: "exercise-menu"; exerciseId: string } | { kind: "note"; target: string | "workout" } | null;

export interface WorkoutEditingOptions {
  initial: Pick<ActiveWorkout, "note" | "exercises">;
  unit: WeightUnit;
  sink: WorkoutChangeSink;
  showToast: (title: string, options?: ToastOptions) => number;
  /** Contexto dos exercícios novos (anterior, recorde, descanso); sem internet, vazio. */
  loadContext: (exerciseIds: string[]) => Promise<Record<string, ExerciseContext>>;
  /** Séries novas já entram concluídas (treino concluído: só as concluídas ficam). */
  newSetsCompleted?: boolean;
  /** Série acabou de ser concluída, com os exercícios já atualizados (o treino em andamento começa o descanso). */
  onSetCompleted?: (exercises: ExerciseView[], exerciseIndex: number, setIndex: number) => void;
  /** Só desenvolvimento: abre já editando uma série. */
  initialEdit?: SetEditTarget | null;
}

/** Séries de um exercício montado agora, já concluídas ou não. */
function withCompletion(exercise: WorkoutExercise, isCompleted: boolean): WorkoutExercise {
  return { ...exercise, sets: exercise.sets.map((s) => ({ ...s, isCompleted })) };
}

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // Sem vibração no aparelho: segue sem ela.
  }
}

/**
 * Estado e ações da lista de exercícios do treino (séries, exercícios, observações, troca e
 * reordenação). Usado pelo treino em andamento e pela edição de um treino concluído; o que muda
 * entre os dois entra pelas opções (para onde vai cada alteração, descanso, série nova concluída).
 */
export function useWorkoutEditing({
  initial,
  unit,
  sink,
  showToast,
  loadContext,
  newSetsCompleted = false,
  onSetCompleted,
  initialEdit = null,
}: WorkoutEditingOptions) {
  const [state, dispatch] = useReducer(workoutReducer, initial, initWorkoutView);
  const [sheet, setSheet] = useState<EditingSheet>(null);
  const [edit, setEdit] = useState<SetEditTarget | null>(initialEdit);
  const [picker, setPicker] = useState<{ mode: "treino" | "troca"; exerciseId?: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [popped, setPopped] = useState<string | null>(null);
  const pendingExerciseRemovals = useRef(new Set<string>());

  // Remove o destaque volt dos itens recém-adicionados.
  const hasFlash = state.exercises.some((e) => e.flash);
  useEffect(() => {
    if (!hasFlash) return;
    const timer = setTimeout(() => dispatch({ type: "clearFlash" }), FLASH_MS);
    return () => clearTimeout(timer);
  }, [hasFlash]);

  // Remoção de exercício só é enviada quando o aviso com "Desfazer" some (ou ao sair da tela).
  const { removeExercise: sinkRemoveExercise } = sink;
  const commitExerciseRemoval = useCallback(
    (exerciseId: string) => {
      if (pendingExerciseRemovals.current.delete(exerciseId)) sinkRemoveExercise(exerciseId);
    },
    [sinkRemoveExercise],
  );
  useEffect(() => {
    const pending = pendingExerciseRemovals.current;
    return () => [...pending].forEach(commitExerciseRemoval);
  }, [commitExerciseRemoval]);

  /* ---------- Séries ---------- */

  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    const ex = state.exercises[exerciseIndex];
    const set = ex?.sets[setIndex];
    if (!ex || !set) return;
    const completed = !set.isCompleted;
    dispatch({ type: "toggleSet", exerciseId: ex.id, setIndex });
    sink.saveSet(ex.id, { ...set, isCompleted: completed });
    if (!completed) {
      setPopped(null);
      return;
    }
    const nextSets = ex.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: true } : s));
    const isRecord = markRecordSets(nextSets, ex.best1RmKg)[setIndex] ?? false;
    vibrate(isRecord ? [20, 40, 20] : 15);
    setPopped(`${ex.id}:${setIndex}`);
    onSetCompleted?.(
      state.exercises.map((e, i) => (i === exerciseIndex ? { ...e, sets: nextSets } : e)),
      exerciseIndex,
      setIndex,
    );
    if (isRecord) {
      // A conclusão da série já vibrou com o padrão de recorde.
      showToast("Recorde pessoal", { tone: "pr", message: `${ex.name} – ${setMetricFor(ex.muscleGroup).formatFull(set, unit)}`, haptic: false });
    }
  };

  const cycleType = (ex: ExerciseView, setIndex: number) => {
    const set = ex.sets[setIndex];
    if (!set) return;
    dispatch({ type: "cycleSetType", exerciseId: ex.id, setIndex });
    const order = ["normal", "warmup", "dropset", "failure"] as const;
    sink.saveSet(ex.id, { ...set, setType: order[(order.indexOf(set.setType) + 1) % order.length] ?? "normal" });
  };

  const addSet = (ex: ExerciseView) => {
    const set = { ...newSetFrom(ex), isCompleted: newSetsCompleted };
    dispatch({ type: "addSet", exerciseId: ex.id, set });
    sink.saveSet(ex.id, set);
  };

  const removeSet = (ex: ExerciseView, setIndex: number) => {
    const set = ex.sets[setIndex];
    if (!set) return;
    dispatch({ type: "removeSet", exerciseId: ex.id, setIndex });
    setEdit(null);
    setPopped(null);
    vibrate(15);
    sink.deleteSet(set.id);
    showToast("Série removida", {
      tone: "undo",
      icon: Trash2,
      message: ex.name,
      actionLabel: "Desfazer",
      onAction: () => {
        dispatch({ type: "restoreSet", exerciseId: ex.id, setIndex, set });
        sink.saveSet(ex.id, set);
      },
    });
  };

  /* ---------- Medidas da série (editadas na unidade exibida; estado como no banco) ---------- */

  const editExercise = edit ? state.exercises.find((e) => e.id === edit.exerciseId) : undefined;
  const editSet = edit && editExercise ? (editExercise.sets[edit.setIndex] ?? null) : null;
  const editMetric = editExercise ? setMetricFor(editExercise.muscleGroup) : SET_METRICS.strength;

  const setEditTitle = (): string => {
    if (!edit || !editExercise || !editSet) return "";
    const label =
      SET_LETTER[editSet.setType] ?? String(editExercise.sets.slice(0, edit.setIndex + 1).filter((s) => s.setType === "normal").length);
    return `Série ${label} · ${editExercise.name}`;
  };

  const changeEditField = (field: EditableField) => setEdit((e) => (e ? { ...e, field } : e));

  const changeEditValue = (field: EditableField, value: number) => {
    if (!edit) return;
    // Valor na unidade exibida (lb, minutos…); o estado (e o banco) guardam kg e segundos.
    const definition = editMetric.fields.find((f) => f.key === field);
    if (!definition) return;
    const stored = definition.fromDisplay(value, unit);
    dispatch({ type: "setField", exerciseId: edit.exerciseId, setIndex: edit.setIndex, field, value: stored });
  };

  const finishEdit = () => {
    if (editExercise && editSet) sink.saveSet(editExercise.id, editSet);
    setEdit(null);
  };

  /* ---------- Exercícios ---------- */

  const removeExercise = (exerciseId: string) => {
    const index = state.exercises.findIndex((e) => e.id === exerciseId);
    const exercise = state.exercises[index];
    if (!exercise) return;
    setSheet(null);
    dispatch({ type: "removeExercise", exerciseId });
    pendingExerciseRemovals.current.add(exerciseId);
    showToast(`${exercise.name} removido`, {
      tone: "undo",
      icon: Trash2,
      actionLabel: "Desfazer",
      onAction: () => {
        pendingExerciseRemovals.current.delete(exerciseId);
        dispatch({ type: "restoreExercise", index, exercise });
      },
      onClose: () => commitExerciseRemoval(exerciseId),
    });
  };

  const openReplace = (exerciseId: string) => {
    setSheet(null);
    setPicker({ mode: "troca", exerciseId });
  };

  const pickExercises = async (chosen: LibraryExercise[]) => {
    const target = picker;
    setPicker(null);
    if (!target || chosen.length === 0) return;
    const context = await loadContext(chosen.map((e) => e.id));

    if (target.mode === "troca" && target.exerciseId && chosen[0]) {
      const index = state.exercises.findIndex((e) => e.id === target.exerciseId);
      const old = state.exercises[index];
      if (!old) return;
      // Mantém o número e o tipo das séries.
      const replacement = withCompletion(buildWorkoutExercise(chosen[0], context[chosen[0].id], old.sets), newSetsCompleted);
      dispatch({ type: "replaceExercise", exerciseId: old.id, exercise: replacement });
      sink.replaceExercise(old.id, replacement, index);
      showToast("Exercício trocado", { tone: "success", icon: ArrowLeftRight });
      return;
    }

    const created = chosen.map((e) => withCompletion(buildWorkoutExercise(e, context[e.id]), newSetsCompleted));
    dispatch({ type: "addExercises", exercises: created });
    sink.addExercises(created, state.exercises.length);
    showToast(created.length === 1 ? `${created[0]?.name} adicionado` : `${created.length} exercícios adicionados`, { tone: "success", icon: Plus });
  };

  /** Nova ordem dos exercícios (position = índice). */
  const reorderExercises = (exerciseIds: string[]) => {
    dispatch({ type: "reorderExercises", exerciseIds });
    sink.reorderExercises(exerciseIds);
  };

  /* ---------- Observações ---------- */

  const openNote = (target: string | "workout") => {
    const text = target === "workout" ? state.note : state.exercises.find((e) => e.id === target)?.note;
    setNoteDraft(text ?? "");
    setSheet({ kind: "note", target });
  };

  const saveNote = () => {
    if (sheet?.kind !== "note") return;
    const note = noteDraft.trim();
    if (sheet.target === "workout") {
      dispatch({ type: "setWorkoutNote", note });
      sink.saveWorkoutNote(note);
    } else {
      dispatch({ type: "setExerciseNote", exerciseId: sheet.target, note });
      sink.saveExerciseNote(sheet.target, note);
    }
    setSheet(null);
    showToast("Observação salva", { tone: "success", icon: NotepadText });
  };

  return {
    state,
    unit,
    popped,
    sheet,
    closeSheet: () => setSheet(null),
    openExerciseMenu: (exerciseId: string) => setSheet({ kind: "exercise-menu", exerciseId }),
    picker,
    openAddExercises: () => setPicker({ mode: "treino" }),
    closePicker: () => setPicker(null),
    pickExercises,
    toggleOpen: (exerciseId: string) => dispatch({ type: "toggleOpen", exerciseId }),
    toggleSet,
    cycleType,
    addSet,
    removeSet,
    edit,
    editSet,
    editMetric,
    setEditTitle,
    startEdit: (target: SetEditTarget) => setEdit(target),
    changeEditField,
    changeEditValue,
    finishEdit,
    removeExercise,
    openReplace,
    reorderExercises,
    noteDraft,
    setNoteDraft,
    openNote,
    saveNote,
  };
}

export type WorkoutEditing = ReturnType<typeof useWorkoutEditing>;
