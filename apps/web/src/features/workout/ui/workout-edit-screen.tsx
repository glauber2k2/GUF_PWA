"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Dumbbell, NotepadText, X } from "lucide-react";
import { getExerciseContext, type EditableWorkout, type ExerciseContext } from "@guf/api";
import { completedVolume, formatElapsed, setsProgressLabel, volumeLabel } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { Banner, BottomSheet, Button, ConfirmDialog, EmptyState, SavingOverlay, SheetOption, SkeletonCard } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { mockWorkoutApi } from "@/mocks/workout";
import { useEditableWorkout, useSaveWorkoutEdit, useWorkoutEditSource } from "@/features/workout/api/use-workout-edit";
import { WorkoutDurationSheet } from "@/features/workout/components/workout-duration-sheet";
import { WorkoutEditor } from "@/features/workout/components/workout-editor";
import { WorkoutHeader } from "@/features/workout/components/workout-header";
import { hasWorkoutEditChanges, toWorkoutEditInput } from "@/features/workout/helpers/workout-edit";
import { initWorkoutView } from "@/features/workout/helpers/workout-state";
import { useScreenToasts } from "@/features/workout/hooks/use-screen-toasts";
import { useWorkoutEditing, type WorkoutChangeSink } from "@/features/workout/hooks/use-workout-editing";
import { BOTTOM_BAR_PROPS } from "@/shared/hooks/use-bottom-clearance";

/** Nada é gravado durante a edição: tudo vai de uma vez em "Salvar alterações". */
const DRAFT_ONLY: WorkoutChangeSink = {
  saveSet: () => undefined,
  deleteSet: () => undefined,
  removeExercise: () => undefined,
  replaceExercise: () => undefined,
  addExercises: () => undefined,
  reorderExercises: () => undefined,
  saveExerciseNote: () => undefined,
  saveWorkoutNote: () => undefined,
};

const SCREEN_PADDING = "flex min-h-dvh flex-col gap-3 px-4 pb-[calc(124px+env(safe-area-inset-bottom))]";

/** Editar um treino concluído: /treino/editar?id=<sessão> (aberto pelo menu do resumo). */
export function WorkoutEditScreen() {
  const sessionId = useSearchParams().get("id");
  const workout = useEditableWorkout(sessionId);
  const goBack = useGoBack();

  if (workout.data) return <WorkoutEditView key={workout.data.id} workout={workout.data} onExit={goBack} />;

  const missing = !sessionId || workout.error?.code === "session_not_found";
  return (
    <main className={SCREEN_PADDING}>
      <WorkoutHeader name="Editar treino" elapsedText="—" paused={false} minimizeIcon={X} minimizeLabel="Sair da edição" onMinimize={goBack} />
      {missing ? (
        <EmptyState
          icon={Dumbbell}
          title="Treino não encontrado"
          message="Este treino foi excluído ou não está mais disponível. Volte e escolha outro."
          actionLabel="Voltar"
          onAction={goBack}
        />
      ) : workout.isError ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void workout.refetch()}>
          {workout.error.message}
        </Banner>
      ) : (
        <div aria-busy="true" aria-label="Carregando treino" className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}
    </main>
  );
}

function WorkoutEditView({ workout, onExit }: { workout: EditableWorkout; onExit: () => void }) {
  const shell = useAppShell();
  const online = useOnlineStatus();
  const { mock } = useWorkoutEditSource();
  const save = useSaveWorkoutEdit();
  const showToast = useScreenToasts();
  const [activeSeconds, setActiveSeconds] = useState(workout.activeSeconds);
  const [overlay, setOverlay] = useState<"duration" | "menu" | "leave" | null>(null);

  /** Contexto para montar exercícios novos (anterior, recorde, descanso); sem internet, vazio. */
  const loadContext = async (ids: string[]): Promise<Record<string, ExerciseContext>> => {
    if (!online) return {};
    const api = mock ? mockWorkoutApi.getExerciseContext : getExerciseContext;
    const { data } = await api(getSupabaseClient(), { exerciseIds: ids, routineId: null });
    return data ?? {};
  };

  const editing = useWorkoutEditing({
    initial: workout,
    unit: workout.weightUnit,
    sink: DRAFT_ONLY,
    showToast,
    loadContext,
    newSetsCompleted: true,
  });

  const initialInput = useMemo(() => toWorkoutEditInput(workout.id, workout.activeSeconds, initWorkoutView(workout)), [workout]);
  const input = toWorkoutEditInput(workout.id, activeSeconds, editing.state);
  const changed = hasWorkoutEditChanges(initialInput, input);
  const allSets = editing.state.exercises.flatMap((e) => e.sets);
  const doneCount = allSets.filter((s) => s.isCompleted).length;

  const leave = () => (changed ? setOverlay("leave") : onExit());

  const submit = () =>
    save.mutate(input, {
      onSuccess: () => {
        shell.showToast("Treino atualizado", { tone: "success", message: "O resumo, o histórico e os recordes já mostram a edição." });
        onExit();
      },
      onError: (error) => shell.showToast("Treino não salvo", { tone: "error", message: error.message }),
    });

  return (
    <>
      <main className={SCREEN_PADDING}>
        <WorkoutHeader
          name={workout.name}
          elapsedText={formatElapsed(activeSeconds)}
          paused={false}
          progressText={setsProgressLabel(doneCount, allSets.length)}
          progressPct={allSets.length ? (doneCount / allSets.length) * 100 : 0}
          volumeText={volumeLabel(completedVolume(allSets), workout.weightUnit)}
          minimizeIcon={X}
          minimizeLabel="Sair da edição"
          onMinimize={leave}
          onEditElapsed={() => setOverlay("duration")}
          onOpenMenu={() => setOverlay("menu")}
        />
        {online ? (
          <Banner tone="info" title="Editando treino">
            só as séries concluídas ficam no treino; recordes e pontos são recalculados ao salvar.
          </Banner>
        ) : (
          <Banner tone="warning" title="Sem conexão">
            para salvar a edição, conecte-se à internet.
          </Banner>
        )}

        <WorkoutEditor
          editing={editing}
          workoutNoteTitle={workout.name}
          exerciseNoteHint="Fica salva só neste treino"
          offline={!online}
          persist={!mock}
        />
      </main>

      <footer {...BOTTOM_BAR_PROPS} className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/92 backdrop-blur-[12px]">
        <div className="mx-auto max-w-[430px] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <Button size="lg" icon={Check} fullWidth disabled={!changed || !online} onClick={submit}>
            {changed ? "Salvar alterações" : "Nenhuma alteração"}
          </Button>
        </div>
      </footer>

      <WorkoutDurationSheet
        open={overlay === "duration"}
        seconds={activeSeconds}
        onClose={() => setOverlay(null)}
        onSave={(seconds) => {
          setActiveSeconds(seconds);
          setOverlay(null);
        }}
      />

      <BottomSheet placement="screen" open={overlay === "menu"} onClose={() => setOverlay(null)} title="Treino" subtitle={workout.name}>
        <SheetOption
          icon={NotepadText}
          title="Observação do treino"
          subtitle={editing.state.note || "Sem observação"}
          onClick={() => {
            setOverlay(null);
            editing.openNote("workout");
          }}
        />
      </BottomSheet>

      <ConfirmDialog
        placement="screen"
        balanced
        open={overlay === "leave"}
        title="Sair sem salvar?"
        message="As alterações feitas neste treino serão perdidas."
        cancelLabel="Continuar editando"
        confirmLabel="Sair sem salvar"
        onCancel={() => setOverlay(null)}
        onConfirm={onExit}
      />
      <SavingOverlay open={save.isPending} title="Salvando treino" message="Leva só um instante." variant={7} />
    </>
  );
}
