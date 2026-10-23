"use client";

import { useEffect, useRef } from "react";
import { ArrowLeftRight, NotepadText, Trash2 } from "lucide-react";
import { AnimatePresence, BottomSheet, Button, LAYOUT_ITEM_PROPS, LayoutItem, SheetOption, TextField } from "@/shared/components/ds";
import { ExercisePicker } from "@/features/exercise-picker";
import { measuresTime } from "@guf/core";
import { useHoldReorder } from "@/shared/hooks/use-hold-reorder";
import { AddExerciseButton } from "@/features/workout/components/add-exercise-button";
import { SetEditSheet } from "@/features/workout/components/set-edit-sheet";
import { REORDER_CARD_PX, WORKOUT_LIST_GAP_PX, WorkoutExerciseCard } from "@/features/workout/components/workout-exercise-card";
import type { CardioStopwatchBarProps } from "@/features/workout/components/cardio-stopwatch-bar";
import { isStopwatchOrphan, stopwatchTarget } from "@/features/workout/helpers/cardio-stopwatch";
import type { ExerciseView } from "@/features/workout/helpers/workout-state";
import type { CardioStopwatch } from "@/features/workout/hooks/use-cardio-stopwatch";
import type { WorkoutEditing } from "@/features/workout/hooks/use-workout-editing";

export interface WorkoutEditorProps {
  editing: WorkoutEditing;
  /** Título da folha de observação do treino (ex.: "Treino de hoje"). */
  workoutNoteTitle: string;
  /** Apoio da opção "Observação" no menu do exercício (onde ela fica salva). */
  exerciseNoteHint: string;
  /** Sem internet: o seletor só mostra o que já está no aparelho. */
  offline: boolean;
  /** false = demonstração (o seletor não grava exercícios criados). */
  persist: boolean;
  /** Cronômetro do cardio: só no treino em andamento (na edição de treino concluído não existe). */
  stopwatch?: CardioStopwatch;
}

/**
 * Lista de exercícios do treino com tudo o que se edita nela: cards (segurar para reordenar),
 * adicionar exercício, folha de carga/repetições, menu do exercício, observação e seletor.
 * Não sabe se o treino está em andamento ou concluído: o estado e as ações vêm de useWorkoutEditing.
 */
export function WorkoutEditor({ editing, workoutNoteTitle, exerciseNoteHint, offline, persist, stopwatch }: WorkoutEditorProps) {
  const { state, unit, sheet } = editing;

  // Série cronometrada que saiu da lista (removida, exercício trocado): o cronômetro para sem gravar.
  const isOrphan = isStopwatchOrphan(state.exercises, stopwatch?.running ?? null);
  const cancelStopwatch = stopwatch?.cancel;
  useEffect(() => {
    if (isOrphan) cancelStopwatch?.();
  }, [isOrphan, cancelStopwatch]);

  const stopwatchFor = (ex: ExerciseView): CardioStopwatchBarProps | undefined => {
    if (!stopwatch || !measuresTime(ex.muscleGroup)) return undefined;
    const target = stopwatchTarget(ex, stopwatch.running);
    if (!target) return undefined;
    return {
      setLabel: `Série ${target.setNumber}`,
      elapsedSeconds: target.isRunningHere ? stopwatch.elapsedSeconds : null,
      isBusy: Boolean(stopwatch.running) && !target.isRunningHere,
      onStart: () => stopwatch.start(ex.id, target.setId),
      onStop: () => {
        const run = stopwatch.stop();
        if (run) editing.setDuration(run.exerciseId, run.setId, run.seconds);
      },
    };
  };
  const listRef = useRef<HTMLDivElement>(null);
  const reorder = useHoldReorder({
    items: state.exercises,
    itemPx: REORDER_CARD_PX,
    gapPx: WORKOUT_LIST_GAP_PX,
    listRef,
    disabled: state.exercises.length < 2,
    onCommit: (ordered) => editing.reorderExercises(ordered.map((e) => e.id)),
  });

  const menuExercise = sheet?.kind === "exercise-menu" ? state.exercises.find((e) => e.id === sheet.exerciseId) : undefined;
  const noteTarget = sheet?.kind === "note" ? sheet.target : null;
  const noteTitle = noteTarget === "workout" ? workoutNoteTitle : state.exercises.find((e) => e.id === noteTarget)?.name;

  return (
    <>
      {/* Cards deslizam para a nova posição (reordenar, remover, desfazer) e somem suavemente.
          relative: referência do card que sai da lista (popLayout); sem transform: topo do arraste. */}
      <div
        ref={listRef}
        role={reorder.active ? "list" : undefined}
        aria-label={reorder.active ? "Ordem dos exercícios" : undefined}
        className="relative flex flex-col gap-3"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {(reorder.active ? reorder.order : state.exercises).map((ex, i, list) => (
            <LayoutItem
              key={ex.id}
              {...LAYOUT_ITEM_PROPS}
              // O card arrastado acompanha o dedo sozinho; os outros deslizam.
              layout={reorder.draggingId === ex.id ? false : "position"}
              className="flex flex-none flex-col"
            >
              <WorkoutExerciseCard
                exercise={ex}
                unit={unit}
                enterDelayMs={i * 40}
                poppedKey={editing.popped}
                editing={editing.edit?.exerciseId === ex.id ? { setIndex: editing.edit.setIndex, field: editing.edit.field } : null}
                holdProps={reorder.holdProps(ex.id)}
                reorder={
                  reorder.active
                    ? { index: i, total: list.length, dragging: reorder.draggingId === ex.id, dragOffset: reorder.dragOffset }
                    : undefined
                }
                onToggleOpen={() => editing.toggleOpen(ex.id)}
                onOpenMenu={() => editing.openExerciseMenu(ex.id)}
                onOpenNote={() => editing.openNote(ex.id)}
                onAddSet={() => editing.addSet(ex)}
                onToggleSet={(si) => editing.toggleSet(i, si)}
                onCycleType={(si) => editing.cycleType(ex, si)}
                onEditField={(si, field) => editing.startEdit({ exerciseId: ex.id, setIndex: si, field })}
                onRemoveSet={(si) => editing.removeSet(ex, si)}
                stopwatch={stopwatchFor(ex)}
              />
            </LayoutItem>
          ))}
        </AnimatePresence>
      </div>

      {!reorder.active && <AddExerciseButton onClick={editing.openAddExercises} />}

      <SetEditSheet
        open={Boolean(editing.edit && editing.editSet)}
        title={editing.setEditTitle()}
        set={editing.editSet}
        metric={editing.editMetric}
        field={editing.edit?.field ?? editing.editMetric.fields[0].key}
        unit={unit}
        onFieldChange={editing.changeEditField}
        onValueChange={editing.changeEditValue}
        onDone={editing.finishEdit}
      />

      <BottomSheet placement="screen" open={Boolean(menuExercise)} onClose={editing.closeSheet} title={menuExercise?.name}>
        <SheetOption
          icon={NotepadText}
          title="Observação"
          subtitle={exerciseNoteHint}
          onClick={() => menuExercise && editing.openNote(menuExercise.id)}
        />
        <SheetOption
          icon={ArrowLeftRight}
          title="Trocar exercício"
          subtitle="Mantém o número de séries"
          onClick={() => menuExercise && editing.openReplace(menuExercise.id)}
        />
        <SheetOption
          icon={Trash2}
          title="Remover exercício"
          subtitle="Dá para desfazer logo depois"
          onClick={() => menuExercise && editing.removeExercise(menuExercise.id)}
        />
      </BottomSheet>

      <BottomSheet placement="screen" open={sheet?.kind === "note"} onClose={editing.closeSheet} title="Observação" subtitle={noteTitle}>
        <TextField
          label="Observação"
          value={editing.noteDraft}
          placeholder="Ex.: pegada aberta, banco no 4"
          onChange={(e) => editing.setNoteDraft(e.target.value)}
        />
        <Button size="tall" fullWidth onClick={editing.saveNote}>
          Salvar
        </Button>
      </BottomSheet>

      {editing.picker && (
        <ExercisePicker
          mode={editing.picker.mode}
          addedExerciseIds={state.exercises.map((e) => e.exerciseId)}
          offline={offline}
          persist={persist}
          onClose={editing.closePicker}
          onConfirm={(list) => void editing.pickExercises(list)}
        />
      )}
    </>
  );
}
