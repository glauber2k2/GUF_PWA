"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  CircleCheck,
  CloudOff,
  Dumbbell,
  Flag,
  Info,
  Play,
  Plus,
  StickyNote,
  Timer,
  Trash2,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { ActiveWorkout, FinishedWorkoutSummary, LibraryExercise, WorkoutSet } from "@guf/api";
import {
  finishWorkoutMessage,
  formatElapsed,
  formatNumber,
  markLoadRecords,
  nextSetLabel,
  setsProgressLabel,
  toLocalISODate,
} from "@guf/core";
import { useAppShell } from "@/components/app-shell/app-shell";
import {
  Banner,
  BottomSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  RestTimer,
  RestTimerBar,
  SheetOption,
  SkeletonCard,
  TextField,
  Toast,
} from "@/components/ds";
import { ExercisePicker } from "@/components/exercise-picker/exercise-picker";
import { useDevWorkoutState, type DevWorkoutFlag } from "@/hooks/use-dev-workout-state";
import { HOME_SUMMARY_KEY } from "@/hooks/use-home-summary";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { getSupabaseClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
// Trocar por "@guf/api" na integração com o Supabase (mesma assinatura).
import {
  addWorkoutExercises,
  deleteSet,
  discardWorkout,
  finishWorkout,
  getWorkout,
  removeWorkoutExercise,
  replaceWorkoutExercise,
  saveExerciseNote,
  saveSet,
  saveWorkoutNote,
  setWorkoutMockFailure,
} from "@/mocks/workout";
import { SetEditSheet } from "./set-edit-sheet";
import { useActiveWorkout, useWorkoutClock, type ActiveWorkoutState } from "./workout-provider";
import { WorkoutExerciseCard } from "./workout-exercise-card";
import { WorkoutHeader } from "./workout-header";
import { WorkoutSummary } from "./workout-summary";
import { initWorkoutView, newSetFrom, workoutReducer, type EditableField, type ExerciseView } from "./workout-state";

const TOAST_MS = 1800;
const UNDO_MS = 4000;
const FLASH_MS = 1300;
const SET_LETTER: Record<string, string> = { warmup: "A", dropset: "D", failure: "F" };

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // ignorar
  }
}

/** Rota /treino?id=… — carrega o treino e mostra o estado certo. */
export function WorkoutScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");
  const dev = useDevWorkoutState();

  if (!sessionId) {
    return (
      <main className="flex min-h-dvh flex-col justify-center px-4">
        <EmptyState
          icon={Dumbbell}
          title="Nenhum treino aberto"
          message="Comece um treino pela Início ou pelo botão Treinar."
          actionLabel="Voltar ao início"
          onAction={() => router.replace("/")}
        />
      </main>
    );
  }
  return <WorkoutLoader key={sessionId} sessionId={sessionId} dev={dev} />;
}

function WorkoutLoader({ sessionId, dev }: { sessionId: string; dev: ReadonlySet<DevWorkoutFlag> }) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [freeWorkout, setFreeWorkout] = useState<ActiveWorkout | null>(null);
  const workout = useQuery({
    queryKey: ["workout", sessionId],
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    queryFn: async () => {
      if (process.env.NODE_ENV === "development" && dev.has("erro")) setWorkoutMockFailure(true);
      const { data, error } = await getWorkout(getSupabaseClient(), { sessionId });
      if (error) throw error;
      return data;
    },
  });
  const offline = dev.has("offline") || !online;

  const data = freeWorkout ?? workout.data;
  if (data && !dev.has("carregando")) {
    return <WorkoutView workout={data} offline={offline} dev={dev} />;
  }

  return (
    <main className="flex min-h-dvh flex-col gap-3 px-4 pb-[calc(124px+env(safe-area-inset-bottom))]">
      <WorkoutHeader name="Treino" elapsedText="—" paused={false} onMinimize={() => router.push("/")} />
      {offline && (
        <Banner tone="warning" title="Sem conexão">
          seu treino está salvo no aparelho
        </Banner>
      )}
      {workout.isError && !dev.has("carregando") ? (
        <>
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void workout.refetch()}>
            Não foi possível carregar a rotina. Verifique a internet e tente de novo.
          </Banner>
          <EmptyState
            icon={CloudOff}
            title="Rotina indisponível"
            message="Enquanto isso, dá para registrar como treino livre e adicionar os exercícios na hora."
            actionLabel="Começar treino livre"
            onAction={() =>
              setFreeWorkout({
                id: sessionId,
                name: "Treino livre",
                routineId: null,
                projectName: null,
                performedOn: toLocalISODate(new Date()),
                startedAt: new Date().toISOString(),
                pausedAt: null,
                pausedSeconds: 0,
                note: null,
                exercises: [],
              })
            }
          />
        </>
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

type Sheet =
  | { kind: "exercise-menu"; exerciseId: string }
  | { kind: "workout-menu" }
  | { kind: "note"; target: string | "workout" }
  | { kind: "timer" }
  | null;

interface ToastState {
  message: string;
  icon: LucideIcon;
  undo?: () => void;
}

function WorkoutView({ workout, offline, dev }: { workout: ActiveWorkout; offline: boolean; dev: ReadonlySet<DevWorkoutFlag> }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const shell = useAppShell();
  const { active, track, clear, togglePause, startRest, adjustRest, toggleRestPause, skipRest, onRestEnd } = useActiveWorkout();
  const [state, dispatch] = useReducer(workoutReducer, workout, initWorkoutView);

  const [sheet, setSheet] = useState<Sheet>(() => (dev.has("timer") ? { kind: "timer" } : null));
  const [dialog, setDialog] = useState<"finish" | "discard" | null>(() => (dev.has("confirmar") ? "finish" : null));
  const [edit, setEdit] = useState<{ exerciseId: string; setIndex: number; field: EditableField } | null>(() =>
    dev.has("editando") && workout.exercises[0] ? { exerciseId: workout.exercises[0].id, setIndex: 2, field: "weightKg" } : null,
  );
  const [picker, setPicker] = useState<{ mode: "treino" | "troca"; exerciseId?: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [popped, setPopped] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [summary, setSummary] = useState<FinishedWorkoutSummary | null>(null);
  const [finishing, setFinishing] = useState(false);
  const pendingExerciseRemoval = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  // Relógio: o do provider (compartilhado com o mini card) ou, até registrar, o do próprio treino.
  const fallback: ActiveWorkoutState = {
    sessionId: workout.id,
    name: workout.name,
    clock: { startedAt: workout.startedAt, pausedAt: workout.pausedAt, pausedSeconds: workout.pausedSeconds },
    rest: null,
  };
  const current = active?.sessionId === workout.id ? active : fallback;
  const { elapsed, paused, restLeft } = useWorkoutClock(summary ? null : current);

  // Registra o treino aberto (mini card nas outras telas) e aplica os estados de desenvolvimento.
  useEffect(() => {
    track({
      sessionId: workout.id,
      name: workout.name,
      clock: { startedAt: workout.startedAt, pausedAt: workout.pausedAt, pausedSeconds: workout.pausedSeconds },
    });
    if (process.env.NODE_ENV === "development") {
      if (dev.has("pausado")) togglePause();
      if (dev.has("descansando") || dev.has("timer")) startRest(54, "Próx.: Puxada frontal 65 × 8");
    }
    // Só ao abrir o treino.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  const showToast = useCallback((message: string, icon: LucideIcon = CircleCheck, undo?: () => void) => {
    setToast({ message, icon, undo });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? UNDO_MS : TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // "Descanso concluído" quando o descanso termina sozinho.
  useEffect(
    () =>
      onRestEnd(() => {
        setSheet((s) => (s?.kind === "timer" ? null : s));
        showToast("Descanso concluído", Timer);
      }),
    [onRestEnd, showToast],
  );

  // Remove o destaque volt dos itens recém-adicionados.
  const hasFlash = state.exercises.some((e) => e.flash);
  useEffect(() => {
    if (!hasFlash) return;
    const timer = setTimeout(() => dispatch({ type: "clearFlash" }), FLASH_MS);
    return () => clearTimeout(timer);
  }, [hasFlash]);

  // Confirma a remoção pendente de exercício ao sair da tela.
  useEffect(
    () => () => {
      const pending = pendingExerciseRemoval.current;
      if (pending) {
        clearTimeout(pending.timer);
        void removeWorkoutExercise(getSupabaseClient(), { sessionExerciseId: pending.id });
      }
    },
    [],
  );

  const client = getSupabaseClient;
  const persist = async (action: Promise<{ error: { message: string } | null }>) => {
    const { error } = await action;
    if (error) showToast(error.message, Info);
  };
  const persistSet = (exerciseId: string, set: WorkoutSet) =>
    persist(
      saveSet(client(), {
        sessionExerciseId: exerciseId,
        setId: set.id,
        set: { setNumber: set.setNumber, setType: set.setType, weightKg: set.weightKg, reps: set.reps, isCompleted: set.isCompleted },
      }),
    );

  const allSets = state.exercises.flatMap((e) => e.sets);
  const doneCount = allSets.filter((s) => s.isCompleted).length;
  const progressPct = allSets.length ? (doneCount / allSets.length) * 100 : 0;

  /* ---------- Séries ---------- */

  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    const ex = state.exercises[exerciseIndex];
    const set = ex?.sets[setIndex];
    if (!ex || !set) return;
    const completed = !set.isCompleted;
    dispatch({ type: "toggleSet", exerciseId: ex.id, setIndex });
    void persistSet(ex.id, { ...set, isCompleted: completed });
    if (!completed) {
      setPopped(null);
      return;
    }
    const nextSets = ex.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: true } : s));
    const isRecord = markLoadRecords(nextSets, ex.bestKg)[setIndex] ?? false;
    vibrate(isRecord ? [20, 40, 20] : 15);
    setPopped(`${ex.id}:${setIndex}`);
    const after = state.exercises.map((e, i) => (i === exerciseIndex ? { ...e, sets: nextSets } : e));
    startRest(
      ex.restSeconds,
      nextSetLabel(
        after.map((e) => ({ exerciseName: e.name, sets: e.sets })),
        exerciseIndex,
        setIndex,
      ),
    );
    if (isRecord) showToast(`Recorde pessoal · ${ex.name} ${formatNumber(set.weightKg ?? 0)} kg`, Trophy);
  };

  const cycleType = (ex: ExerciseView, setIndex: number) => {
    const set = ex.sets[setIndex];
    if (!set) return;
    dispatch({ type: "cycleSetType", exerciseId: ex.id, setIndex });
    const order = ["normal", "warmup", "dropset", "failure"] as const;
    const nextType = order[(order.indexOf(set.setType) + 1) % order.length] ?? "normal";
    void persistSet(ex.id, { ...set, setType: nextType });
  };

  const addSet = (ex: ExerciseView) => {
    const set = newSetFrom(ex);
    dispatch({ type: "addSet", exerciseId: ex.id, set });
    void persistSet(ex.id, set);
  };

  const removeSet = (ex: ExerciseView, setIndex: number) => {
    const set = ex.sets[setIndex];
    if (!set) return;
    dispatch({ type: "removeSet", exerciseId: ex.id, setIndex });
    setEdit(null);
    setPopped(null);
    vibrate(15);
    void persist(deleteSet(client(), { setId: set.id }));
    showToast(`Série removida · ${ex.name}`, Trash2, () => {
      dispatch({ type: "restoreSet", exerciseId: ex.id, setIndex, set });
      void persistSet(ex.id, set);
      setToast(null);
    });
  };

  /* ---------- Edição de carga/reps ---------- */

  const editExercise = edit ? state.exercises.find((e) => e.id === edit.exerciseId) : undefined;
  const editSet = edit && editExercise ? (editExercise.sets[edit.setIndex] ?? null) : null;
  const editTitle = (() => {
    if (!edit || !editExercise || !editSet) return "";
    const label =
      SET_LETTER[editSet.setType] ??
      String(editExercise.sets.slice(0, edit.setIndex + 1).filter((s) => s.setType === "normal").length);
    return `Série ${label} · ${editExercise.name}`;
  })();
  const finishEdit = () => {
    if (editExercise && editSet) void persistSet(editExercise.id, editSet);
    setEdit(null);
  };

  /* ---------- Exercícios ---------- */

  const removeExercise = (exerciseId: string) => {
    const index = state.exercises.findIndex((e) => e.id === exerciseId);
    const exercise = state.exercises[index];
    if (!exercise) return;
    setSheet(null);
    dispatch({ type: "removeExercise", exerciseId });
    // A remoção só vai para o banco depois do prazo do "Desfazer".
    const pending = pendingExerciseRemoval.current;
    if (pending) {
      clearTimeout(pending.timer);
      void removeWorkoutExercise(client(), { sessionExerciseId: pending.id });
    }
    pendingExerciseRemoval.current = {
      id: exerciseId,
      timer: setTimeout(() => {
        pendingExerciseRemoval.current = null;
        void persist(removeWorkoutExercise(client(), { sessionExerciseId: exerciseId }));
      }, UNDO_MS),
    };
    showToast(`${exercise.name} removido`, Trash2, () => {
      if (pendingExerciseRemoval.current?.id === exerciseId) {
        clearTimeout(pendingExerciseRemoval.current.timer);
        pendingExerciseRemoval.current = null;
      }
      dispatch({ type: "restoreExercise", index, exercise });
      setToast(null);
    });
  };

  const onPicked = async (chosen: LibraryExercise[]) => {
    const target = picker;
    setPicker(null);
    if (!target) return;
    if (target.mode === "troca" && target.exerciseId && chosen[0]) {
      const { data, error } = await replaceWorkoutExercise(client(), {
        sessionId: workout.id,
        sessionExerciseId: target.exerciseId,
        exerciseId: chosen[0].id,
      });
      if (error) return showToast(error.message, Info);
      dispatch({ type: "replaceExercise", exerciseId: target.exerciseId, exercise: data });
      return showToast("Exercício trocado", ArrowLeftRight);
    }
    const { data, error } = await addWorkoutExercises(client(), {
      sessionId: workout.id,
      exerciseIds: chosen.map((e) => e.id),
    });
    if (error) return showToast(error.message, Info);
    dispatch({ type: "addExercises", exercises: data });
    showToast(data.length === 1 ? `${data[0]?.name} adicionado` : `${data.length} exercícios adicionados`, Plus);
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
      void persist(saveWorkoutNote(client(), { sessionId: workout.id, note }));
    } else {
      dispatch({ type: "setExerciseNote", exerciseId: sheet.target, note });
      void persist(saveExerciseNote(client(), { sessionExerciseId: sheet.target, note }));
    }
    setSheet(null);
    showToast("Observação salva", StickyNote);
  };

  /* ---------- Finalizar / descartar ---------- */

  const finish = async () => {
    setFinishing(true);
    const { data, error } = await finishWorkout(client(), { sessionId: workout.id });
    setFinishing(false);
    if (error) return showToast(error.message, Info);
    setDialog(null);
    setSheet(null);
    skipRest();
    clear();
    void queryClient.invalidateQueries({ queryKey: [HOME_SUMMARY_KEY] });
    setSummary(data);
  };

  const discard = async () => {
    const { error } = await discardWorkout(client(), { sessionId: workout.id });
    if (error) return showToast(error.message, Info);
    clear();
    void queryClient.invalidateQueries({ queryKey: [HOME_SUMMARY_KEY] });
    shell.showToast("Treino descartado");
    router.replace("/");
  };

  if (summary) {
    return (
      <WorkoutSummary
        name={workout.name}
        projectName={workout.projectName}
        performedOn={workout.performedOn}
        summary={summary}
        onDone={() => {
          shell.showToast("Treino salvo no histórico");
          router.replace("/");
        }}
        onOpenHistory={() => shell.showToast("O Histórico chega em breve")}
      />
    );
  }

  const resting = Boolean(current.rest);
  const menuExercise = sheet?.kind === "exercise-menu" ? state.exercises.find((e) => e.id === sheet.exerciseId) : undefined;
  const noteTitle =
    sheet?.kind === "note" ? (sheet.target === "workout" ? "Treino de hoje" : state.exercises.find((e) => e.id === sheet.target)?.name) : undefined;

  return (
    <>
      <main
        className={cn(
          "flex min-h-dvh flex-col gap-3 px-4",
          resting ? "pb-[calc(200px+env(safe-area-inset-bottom))]" : "pb-[calc(124px+env(safe-area-inset-bottom))]",
        )}
      >
        <WorkoutHeader
          name={workout.name}
          elapsedText={formatElapsed(elapsed)}
          paused={paused}
          progressText={setsProgressLabel(doneCount, allSets.length)}
          progressPct={progressPct}
          onMinimize={() => router.push("/")}
          onTogglePause={togglePause}
          onOpenMenu={() => setSheet({ kind: "workout-menu" })}
        />
        {offline && (
          <Banner tone="warning" title="Sem conexão">
            seu treino está salvo no aparelho
          </Banner>
        )}

        {state.exercises.map((ex, i) => (
          <WorkoutExerciseCard
            key={ex.id}
            exercise={ex}
            enterDelayMs={i * 40}
            poppedKey={popped}
            editing={edit?.exerciseId === ex.id ? { setIndex: edit.setIndex, field: edit.field } : null}
            onToggleOpen={() => dispatch({ type: "toggleOpen", exerciseId: ex.id })}
            onOpenMenu={() => setSheet({ kind: "exercise-menu", exerciseId: ex.id })}
            onOpenNote={() => openNote(ex.id)}
            onAddSet={() => addSet(ex)}
            onToggleSet={(si) => toggleSet(i, si)}
            onCycleType={(si) => cycleType(ex, si)}
            onEditField={(si, field) => setEdit({ exerciseId: ex.id, setIndex: si, field })}
            onRemoveSet={(si) => removeSet(ex, si)}
          />
        ))}

        <button
          type="button"
          onClick={() => setPicker({ mode: "treino" })}
          className={cn(
            "flex h-14 flex-none cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong",
            "bg-transparent text-[15px] font-semibold text-fg hover:bg-surface-3",
            "transition-[transform,background-color] duration-150 ease-standard active:scale-[.97] motion-reduce:active:scale-100",
          )}
        >
          <Plus size={18} aria-hidden="true" />
          Adicionar exercício
        </button>
      </main>

      {current.rest && (
        <div className="fixed inset-x-3 bottom-[calc(112px+env(safe-area-inset-bottom))] z-[12] mx-auto max-w-[406px] animate-guf-up">
          <RestTimerBar
            remaining={restLeft}
            total={current.rest.total}
            next={current.rest.next}
            onAdd={() => adjustRest(15)}
            onSkip={skipRest}
            onClick={() => setSheet({ kind: "timer" })}
          />
        </div>
      )}

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/92 backdrop-blur-[12px]">
        <div className="mx-auto max-w-[430px] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
          {paused ? (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Button size="lg" icon={Play} fullWidth onClick={togglePause}>
                Retomar
              </Button>
              <Button variant="secondary" size="lg" onClick={() => setDialog("finish")}>
                Finalizar
              </Button>
            </div>
          ) : (
            <Button size="lg" icon={Flag} fullWidth onClick={() => setDialog("finish")}>
              Finalizar treino
            </Button>
          )}
        </div>
      </footer>

      {toast && (
        <div
          className={cn(
            "fixed inset-x-4 z-[25] mx-auto max-w-[398px] animate-guf-rise-fast",
            resting ? "bottom-[calc(186px+env(safe-area-inset-bottom))]" : "bottom-[calc(114px+env(safe-area-inset-bottom))]",
          )}
        >
          <Toast message={toast.message} icon={toast.icon} actionLabel={toast.undo ? "Desfazer" : undefined} onAction={toast.undo} />
        </div>
      )}

      <SetEditSheet
        open={Boolean(edit && editSet)}
        title={editTitle}
        set={editSet}
        field={edit?.field ?? "weightKg"}
        onFieldChange={(field) => setEdit((e) => (e ? { ...e, field } : e))}
        onValueChange={(field, value) =>
          edit && dispatch({ type: "setField", exerciseId: edit.exerciseId, setIndex: edit.setIndex, field, value })
        }
        onDone={finishEdit}
      />

      <BottomSheet
        placement="screen"
        open={sheet?.kind === "timer" && Boolean(current.rest)}
        onClose={() => setSheet(null)}
        title="Descanso"
        subtitle={current.rest?.next}
      >
        <div className="py-2">
          <RestTimer
            remaining={restLeft}
            total={current.rest?.total ?? 1}
            running={Boolean(current.rest?.endsAt) && !paused}
            onToggle={toggleRestPause}
            onMinus={() => adjustRest(-15)}
            onPlus={() => adjustRest(15)}
            onSkip={() => {
              skipRest();
              setSheet(null);
            }}
          />
        </div>
      </BottomSheet>

      <BottomSheet placement="screen" open={sheet?.kind === "workout-menu"} onClose={() => setSheet(null)} title="Treino" subtitle={workout.name}>
        <SheetOption icon={StickyNote} title="Observação do treino" subtitle={state.note || "Sem observação"} onClick={() => openNote("workout")} />
        <SheetOption
          icon={Trash2}
          title="Descartar treino"
          subtitle="Apaga as séries registradas hoje"
          onClick={() => {
            setSheet(null);
            setDialog("discard");
          }}
        />
      </BottomSheet>

      <BottomSheet placement="screen" open={Boolean(menuExercise)} onClose={() => setSheet(null)} title={menuExercise?.name}>
        <SheetOption
          icon={StickyNote}
          title="Observação"
          subtitle="Fica salva para os próximos treinos"
          onClick={() => menuExercise && openNote(menuExercise.id)}
        />
        <SheetOption
          icon={ArrowLeftRight}
          title="Trocar exercício"
          subtitle="Mantém o número de séries"
          onClick={() => {
            if (!menuExercise) return;
            setSheet(null);
            setPicker({ mode: "troca", exerciseId: menuExercise.id });
          }}
        />
        <SheetOption
          icon={Trash2}
          title="Remover exercício"
          subtitle="Dá para desfazer logo depois"
          onClick={() => menuExercise && removeExercise(menuExercise.id)}
        />
      </BottomSheet>

      <BottomSheet placement="screen" open={sheet?.kind === "note"} onClose={() => setSheet(null)} title="Observação" subtitle={noteTitle}>
        <TextField
          label="Observação"
          value={noteDraft}
          placeholder="Ex.: pegada aberta, banco no 4"
          onChange={(e) => setNoteDraft(e.target.value)}
        />
        <Button size="tall" fullWidth onClick={saveNote}>
          Salvar
        </Button>
      </BottomSheet>

      <ConfirmDialog
        placement="screen"
        open={dialog === "finish"}
        title="Finalizar treino?"
        message={finishWorkoutMessage(allSets.length - doneCount)}
        cancelLabel="Continuar"
        confirmLabel={finishing ? "Finalizando…" : "Finalizar"}
        onCancel={() => setDialog(null)}
        onConfirm={() => void finish()}
      />
      <ConfirmDialog
        placement="screen"
        open={dialog === "discard"}
        title="Descartar treino?"
        message="As séries registradas hoje serão apagadas. Não dá para desfazer."
        cancelLabel="Continuar"
        confirmLabel="Descartar"
        destructive
        onCancel={() => setDialog(null)}
        onConfirm={() => void discard()}
      />

      {picker && (
        <ExercisePicker
          mode={picker.mode}
          addedExerciseIds={state.exercises.map((e) => e.exerciseId)}
          offline={offline}
          onClose={() => setPicker(null)}
          onConfirm={(list) => void onPicked(list)}
        />
      )}
    </>
  );
}
