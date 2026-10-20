"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  CloudOff,
  Dumbbell,
  Flag,
  Play,
  Plus,
  NotepadText,
  Timer,
  Trash2,
} from "lucide-react";
import {
  finishWorkout,
  updateRoutineFromWorkout,
  getExerciseContext,
  isNetworkError,
  type ActiveWorkout,
  type ExerciseContext,
  type FinishedWorkoutSummary,
  type LibraryExercise,
  type WorkoutSet,
} from "@guf/api";
import {
  finishWorkoutMessage,
  formatElapsed,
  formatNumber,
  fromDisplayWeight,
  markRecordSets,
  nextSetLabel,
  setsProgressLabel,
  toDisplayWeight,
  toLocalISODate,
} from "@guf/core";
import { useAppShell, useRaisedToast, type ToastOptions } from "@/features/app-shell";
import {
  AnimatePresence,
  Banner,
  BottomSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  LAYOUT_ITEM_PROPS,
  LayoutItem,
  RestTimer,
  RestTimerBar,
  SavingOverlay,
  SheetOption,
  SkeletonCard,
  TextField,
} from "@/shared/components/ds";
import { ExercisePicker } from "@/features/exercise-picker";
import { historyAnchorPath } from "@/features/history";
import { ShareStorySheet, STORY_SAVED_TOAST } from "@/features/share";
import { useDevWorkoutState, type DevWorkoutFlag } from "@/features/workout/hooks/use-dev-workout-state";
import { useHoldReorder } from "@/shared/hooks/use-hold-reorder";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import type { OutboxOp } from "@/shared/offline/db";
import { dismissOutboxFailure, enqueue, flushOutbox, hasPendingFor, useOutboxStatus } from "@/shared/offline/outbox";
import { loadWorkout, removeWorkoutSnapshot, saveWorkoutSnapshot, type DataSource } from "@/shared/offline/workout-repo";
import { invalidatePlanningData, invalidateTrainingData } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { cn } from "@/shared/helpers/class-names";
import { mockWorkoutApi } from "@/mocks/workout";
import { SetEditSheet } from "@/features/workout/components/set-edit-sheet";
import { buildWorkoutExercise, localSummary, toNewWorkoutExercise, workoutSnapshot } from "@/features/workout/helpers/workout-builders";
import { useActiveWorkout, useWorkoutClock, type ActiveWorkoutState } from "@/features/workout/providers/workout-provider";
import { AddExerciseButton } from "@/features/workout/components/add-exercise-button";
import { REORDER_CARD_PX, WORKOUT_LIST_GAP_PX, WorkoutExerciseCard } from "@/features/workout/components/workout-exercise-card";
import { WorkoutHeader } from "@/features/workout/components/workout-header";
import { WorkoutSummary } from "@/features/workout/components/workout-summary";
import { initWorkoutView, newSetFrom, workoutReducer, type EditableField, type ExerciseView } from "@/features/workout/helpers/workout-state";

const FLASH_MS = 1300;
const SET_LETTER: Record<string, string> = { warmup: "A", dropset: "D", failure: "F" };
const WORKOUT_KEY = "workout";
/** Treino finalizado sem internet: fica no aparelho até a fila enviar. */
const PENDING_TOAST: [string, ToastOptions] = [
  "Treino salvo no aparelho",
  { tone: "warning", icon: CloudOff, message: "Ele aparece no histórico quando a internet voltar." },
];

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
  const { active, clear } = useActiveWorkout();
  const [freeWorkout, setFreeWorkout] = useState<ActiveWorkout | null>(null);
  // Demonstração (só em desenvolvimento): treino do design via mock, sem gravar nada.
  const demo = process.env.NODE_ENV === "development" && dev.has("demo");
  const workout = useQuery({
    queryKey: [WORKOUT_KEY, sessionId, demo],
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    queryFn: async (): Promise<{ workout: ActiveWorkout; source: DataSource }> => {
      if (process.env.NODE_ENV === "development" && dev.has("erro")) throw new Error("Simulação de erro (?estado=erro).");
      if (demo) {
        const { data, error } = await mockWorkoutApi.getWorkout(getSupabaseClient(), { sessionId });
        if (error) throw error;
        return { workout: data, source: "network" };
      }
      const { data, error } = await loadWorkout(sessionId);
      if (error) throw error;
      return data;
    },
  });
  const offline = dev.has("offline") || !online;

  const data = freeWorkout ? { workout: freeWorkout, source: "device" as const } : workout.data;
  if (data && !dev.has("carregando")) {
    return <WorkoutView workout={data.workout} source={data.source} persist={!demo} offline={offline} dev={dev} />;
  }

  const notFound = (workout.error as { code?: string } | null)?.code === "workout_not_found";

  return (
    <main className="flex min-h-dvh flex-col gap-3 px-4 pb-[calc(124px+env(safe-area-inset-bottom))]">
      <WorkoutHeader name="Treino" elapsedText="—" paused={false} onMinimize={() => router.push("/")} />
      {offline && (
        <Banner tone="warning" title="Sem conexão">
          seu treino está salvo no aparelho
        </Banner>
      )}
      {notFound ? (
        <EmptyState
          icon={Dumbbell}
          title="Treino encerrado"
          message="Este treino já foi finalizado (por você, em outro aparelho ou automaticamente) e está no seu histórico."
          actionLabel="Voltar ao início"
          onAction={() => {
            if (active?.sessionId === sessionId) clear();
            router.replace("/");
          }}
        />
      ) : workout.isError && !dev.has("carregando") ? (
        <>
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void workout.refetch()}>
            Não foi possível carregar o treino. Verifique a internet e tente de novo.
          </Banner>
          <EmptyState
            icon={CloudOff}
            title="Treino indisponível"
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
                activePeriods: [{ startedAt: new Date().toISOString(), endedAt: null }],
                note: null,
                weightUnit: "kg",
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

interface WorkoutViewProps {
  workout: ActiveWorkout;
  source: DataSource;
  /** false = demonstração (não grava). */
  persist: boolean;
  offline: boolean;
  dev: ReadonlySet<DevWorkoutFlag>;
}

function WorkoutView({ workout, source, persist, offline, dev }: WorkoutViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const shell = useAppShell();
  const outbox = useOutboxStatus();
  const { active, track, clear, togglePause, startRest, adjustRest, toggleRestPause, skipRest, onRestEnd } = useActiveWorkout();
  const [state, dispatch] = useReducer(workoutReducer, workout, initWorkoutView);
  const unit = workout.weightUnit;

  const [sheet, setSheet] = useState<Sheet>(() => (dev.has("timer") ? { kind: "timer" } : null));
  const [dialog, setDialog] = useState<"finish" | "update-routine" | "discard" | null>(() => (dev.has("confirmar") ? "finish" : null));
  const [edit, setEdit] = useState<{ exerciseId: string; setIndex: number; field: EditableField } | null>(() =>
    dev.has("editando") && workout.exercises[0] ? { exerciseId: workout.exercises[0].id, setIndex: 0, field: "weightKg" } : null,
  );
  const [picker, setPicker] = useState<{ mode: "treino" | "troca"; exerciseId?: string } | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [popped, setPopped] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ data: FinishedWorkoutSummary; pending: boolean } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const pendingExerciseRemovals = useRef(new Set<string>());

  // Relógio: o do provider (compartilhado com o mini card) ou, até registrar, o do próprio treino.
  const baseClock = { startedAt: workout.startedAt, periods: workout.activePeriods };
  const fallback: ActiveWorkoutState = { sessionId: workout.id, name: workout.name, clock: baseClock, rest: null, persist };
  const current = active?.sessionId === workout.id ? active : fallback;
  const { elapsed, paused, restLeft } = useWorkoutClock(summary ? null : current);

  // Registra o treino aberto (mini card nas outras telas) e aplica os estados de desenvolvimento.
  useEffect(() => {
    track({ sessionId: workout.id, name: workout.name, clock: baseClock, persist });
    if (process.env.NODE_ENV === "development") {
      if (dev.has("pausado")) togglePause();
      if (dev.has("descansando") || dev.has("timer")) startRest(54, "Próx.: série seguinte");
    }
    // Só ao abrir o treino.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  // Retrato do treino no aparelho a cada alteração (abre sem internet com tudo o que foi feito).
  const clock = current.clock;
  useEffect(() => {
    if (!persist || summary) return;
    void saveWorkoutSnapshot(workoutSnapshot(workout, state, clock));
  }, [persist, summary, workout, state, clock]);

  // Avisos com ação ("Desfazer") só valem nesta tela: saem junto com ela.
  const { showToast: shellToast, dismissToast } = shell;
  const actionToasts = useRef(new Set<number>());
  const showToast = useCallback(
    (title: string, options: ToastOptions = {}) => {
      const id = shellToast(title, options);
      if (options.onAction) actionToasts.current.add(id);
      return id;
    },
    [shellToast],
  );
  useEffect(() => {
    const ids = actionToasts.current;
    return () => ids.forEach((id) => dismissToast(id));
  }, [dismissToast]);

  // Descanso no rodapé: a pilha de avisos sobe para não cobri-lo.
  useRaisedToast(Boolean(current.rest) && !summary);

  // Fila: avisa quando uma alteração foi descartada por erro.
  useEffect(() => {
    if (!outbox.lastFailure) return;
    const timer = setTimeout(() => {
      showToast("Uma alteração não foi salva", { tone: "error", message: outbox.lastFailure ?? undefined });
      dismissOutboxFailure();
    }, 0);
    return () => clearTimeout(timer);
  }, [outbox.lastFailure, showToast]);

  // "Descanso concluído" quando o descanso termina sozinho.
  useEffect(
    () =>
      onRestEnd(() => {
        setSheet((s) => (s?.kind === "timer" ? null : s));
        showToast("Descanso concluído", { tone: "info", icon: Timer });
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

  /** Grava pela fila offline (na demonstração, não grava nada). */
  const queue = useCallback(
    (op: OutboxOp) => {
      if (persist) void enqueue(op);
    },
    [persist],
  );

  // Remoção de exercício só entra na fila quando o aviso com "Desfazer" some (ou ao sair da tela).
  const commitExerciseRemoval = useCallback(
    (exerciseId: string) => {
      if (!pendingExerciseRemovals.current.delete(exerciseId)) return;
      queue({ kind: "removeExercise", sessionId: workout.id, sessionExerciseId: exerciseId });
    },
    [queue, workout.id],
  );
  useEffect(() => {
    const pending = pendingExerciseRemovals.current;
    return () => [...pending].forEach(commitExerciseRemoval);
  }, [commitExerciseRemoval]);

  const saveSetOp = (exerciseId: string, set: WorkoutSet) =>
    queue({
      kind: "saveSet",
      sessionId: workout.id,
      sessionExerciseId: exerciseId,
      set: { id: set.id, setNumber: set.setNumber, setType: set.setType, weightKg: set.weightKg, reps: set.reps, isCompleted: set.isCompleted },
    });

  const allSets = state.exercises.flatMap((e) => e.sets);
  const doneCount = allSets.filter((s) => s.isCompleted).length;
  const progressPct = allSets.length ? (doneCount / allSets.length) * 100 : 0;
  const displayLoad = (kg: number | null) => toDisplayWeight(kg, unit);

  /* ---------- Séries ---------- */

  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    const ex = state.exercises[exerciseIndex];
    const set = ex?.sets[setIndex];
    if (!ex || !set) return;
    const completed = !set.isCompleted;
    dispatch({ type: "toggleSet", exerciseId: ex.id, setIndex });
    saveSetOp(ex.id, { ...set, isCompleted: completed });
    if (!completed) {
      setPopped(null);
      return;
    }
    const nextSets = ex.sets.map((s, i) => (i === setIndex ? { ...s, isCompleted: true } : s));
    const isRecord = markRecordSets(nextSets, ex.best1RmKg)[setIndex] ?? false;
    vibrate(isRecord ? [20, 40, 20] : 15);
    setPopped(`${ex.id}:${setIndex}`);
    const after = state.exercises.map((e, i) => (i === exerciseIndex ? { ...e, sets: nextSets } : e));
    startRest(
      ex.restSeconds,
      nextSetLabel(
        after.map((e) => ({ exerciseName: e.name, sets: e.sets.map((s) => ({ ...s, weightKg: displayLoad(s.weightKg) })) })),
        exerciseIndex,
        setIndex,
      ),
    );
    if (isRecord) {
      const load = `${formatNumber(displayLoad(set.weightKg) ?? 0)} ${unit}`;
      // A conclusão da série já vibrou com o padrão de recorde.
      showToast("Recorde pessoal", {
        tone: "pr",
        message: `${ex.name} – ${set.reps ? `${load} × ${set.reps}` : load}`,
        haptic: false,
      });
    }
  };

  const cycleType = (ex: ExerciseView, setIndex: number) => {
    const set = ex.sets[setIndex];
    if (!set) return;
    dispatch({ type: "cycleSetType", exerciseId: ex.id, setIndex });
    const order = ["normal", "warmup", "dropset", "failure"] as const;
    saveSetOp(ex.id, { ...set, setType: order[(order.indexOf(set.setType) + 1) % order.length] ?? "normal" });
  };

  const addSet = (ex: ExerciseView) => {
    const set = newSetFrom(ex);
    dispatch({ type: "addSet", exerciseId: ex.id, set });
    saveSetOp(ex.id, set);
  };

  const removeSet = (ex: ExerciseView, setIndex: number) => {
    const set = ex.sets[setIndex];
    if (!set) return;
    dispatch({ type: "removeSet", exerciseId: ex.id, setIndex });
    setEdit(null);
    setPopped(null);
    vibrate(15);
    queue({ kind: "deleteSet", sessionId: workout.id, setId: set.id });
    showToast("Série removida", {
      tone: "undo",
      icon: Trash2,
      message: ex.name,
      actionLabel: "Desfazer",
      onAction: () => {
        dispatch({ type: "restoreSet", exerciseId: ex.id, setIndex, set });
        saveSetOp(ex.id, set);
      },
    });
  };

  /* ---------- Edição de carga/reps (na unidade do usuário; estado em kg) ---------- */

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
    if (editExercise && editSet) saveSetOp(editExercise.id, editSet);
    setEdit(null);
  };

  /* ---------- Exercícios ---------- */

  /** Contexto para montar exercícios novos (anterior, recorde, descanso); sem internet, vazio. */
  const contextFor = async (ids: string[]): Promise<Record<string, ExerciseContext>> => {
    if (offline) return {};
    const api = persist ? getExerciseContext : mockWorkoutApi.getExerciseContext;
    const { data } = await api(getSupabaseClient(), { exerciseIds: ids, routineId: workout.routineId });
    return data ?? {};
  };

  const removeExercise = (exerciseId: string) => {
    const index = state.exercises.findIndex((e) => e.id === exerciseId);
    const exercise = state.exercises[index];
    if (!exercise) return;
    setSheet(null);
    dispatch({ type: "removeExercise", exerciseId });
    // A remoção só entra na fila quando o prazo do "Desfazer" acaba.
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

  const onPicked = async (chosen: LibraryExercise[]) => {
    const target = picker;
    setPicker(null);
    if (!target || chosen.length === 0) return;
    const context = await contextFor(chosen.map((e) => e.id));

    if (target.mode === "troca" && target.exerciseId && chosen[0]) {
      const index = state.exercises.findIndex((e) => e.id === target.exerciseId);
      const old = state.exercises[index];
      if (!old) return;
      // Mantém o número e o tipo das séries.
      const replacement = buildWorkoutExercise(chosen[0], context[chosen[0].id], old.sets);
      dispatch({ type: "replaceExercise", exerciseId: old.id, exercise: replacement });
      queue({
        kind: "replaceExercise",
        sessionId: workout.id,
        sessionExerciseId: old.id,
        exercise: toNewWorkoutExercise(replacement, index),
      });
      return showToast("Exercício trocado", { tone: "success", icon: ArrowLeftRight });
    }

    const created = chosen.map((e) => buildWorkoutExercise(e, context[e.id]));
    dispatch({ type: "addExercises", exercises: created });
    queue({
      kind: "addExercises",
      sessionId: workout.id,
      exercises: created.map((e, i) => toNewWorkoutExercise(e, state.exercises.length + i)),
    });
    showToast(created.length === 1 ? `${created[0]?.name} adicionado` : `${created.length} exercícios adicionados`, { tone: "success", icon: Plus });
  };

  /** Nova ordem dos exercícios: muda na tela e vai pela fila (position = índice). */
  const reorderExercises = (exerciseIds: string[]) => {
    dispatch({ type: "reorderExercises", exerciseIds });
    queue({ kind: "reorderExercises", sessionId: workout.id, sessionExerciseIds: exerciseIds });
  };

  // Segurar um card: modo de reordenar (cards compactos balançando; arrastar muda a ordem).
  const listRef = useRef<HTMLDivElement>(null);
  const reorder = useHoldReorder({
    items: state.exercises,
    itemPx: REORDER_CARD_PX,
    gapPx: WORKOUT_LIST_GAP_PX,
    listRef,
    disabled: state.exercises.length < 2,
    onCommit: (ordered) => reorderExercises(ordered.map((e) => e.id)),
  });

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
      queue({ kind: "workoutNote", sessionId: workout.id, note });
    } else {
      dispatch({ type: "setExerciseNote", exerciseId: sheet.target, note });
      queue({ kind: "exerciseNote", sessionId: workout.id, sessionExerciseId: sheet.target, note });
    }
    setSheet(null);
    showToast("Observação salva", { tone: "success", icon: NotepadText });
  };

  /* ---------- Finalizar / descartar ---------- */

  const closeOut = () => {
    setDialog(null);
    setSheet(null);
    skipRest();
    clear();
    void invalidateTrainingData(queryClient);
  };

  /** Confirmou finalizar: treino de rotina pergunta antes se a rotina deve virar este treino. */
  const confirmFinish = () => {
    if (workout.routineId) return setDialog("update-routine");
    void finish(false);
  };

  const finish = async (updateRoutine: boolean) => {
    setDialog(null);
    setFinishing(true);
    const local = localSummary(state, clock);
    try {
      if (!persist) {
        const { data, error } = await mockWorkoutApi.finishWorkout(getSupabaseClient(), { sessionId: workout.id });
        if (error) return showToast(error.message, { tone: "error" });
        closeOut();
        return setSummary({ data, pending: false });
      }
      // Online: envia o que estiver pendente e finaliza no servidor (resumo e recordes oficiais).
      await flushOutbox();
      if (!offline && !(await hasPendingFor(workout.id))) {
        const { data, error } = await finishWorkout(getSupabaseClient(), { sessionId: workout.id });
        if (data) {
          await removeWorkoutSnapshot(workout.id);
          if (updateRoutine) await applyToRoutine();
          closeOut();
          return setSummary({ data, pending: false });
        }
        // Já encerrado no servidor (finalização automática ou outro aparelho): o shell avisa quem
        // encerrou e leva ao resumo oficial (o treino já está no histórico).
        if (error.code === "workout_not_found") {
          const closed = await shell.resolveClosedWorkout(workout.id);
          closeOut();
          if (!closed) {
            await removeWorkoutSnapshot(workout.id);
            router.replace("/");
          }
          return;
        }
        if (!isNetworkError(error)) return showToast(error.message, { tone: "error" });
      }
      // Sem conexão: finaliza no aparelho e envia quando a internet voltar (a rotina vai junto).
      await enqueue({ kind: "finish", sessionId: workout.id, updateRoutine });
      closeOut();
      setSummary({ data: local, pending: true });
    } finally {
      setFinishing(false);
    }
  };

  /** Os exercícios e séries deste treino viram os da rotina (já finalizado no servidor). */
  const applyToRoutine = async () => {
    const { error } = await updateRoutineFromWorkout(getSupabaseClient(), { sessionId: workout.id });
    if (error) {
      shell.showToast("Rotina não atualizada", { tone: "error", message: error.message });
      return;
    }
    void invalidatePlanningData(queryClient);
    shell.showToast("Rotina atualizada", { tone: "success", message: "O próximo treino começa igual a este." });
  };

  const discard = async () => {
    if (persist) {
      await enqueue({ kind: "discard", sessionId: workout.id });
      await removeWorkoutSnapshot(workout.id);
    } else {
      await mockWorkoutApi.discardWorkout(getSupabaseClient(), { sessionId: workout.id });
    }
    closeOut();
    shell.showToast("Treino descartado", { tone: "success", icon: Trash2 });
    router.replace("/");
  };

  if (summary) {
    return (
      <>
        <WorkoutSummary
          name={workout.name}
          projectName={workout.projectName}
          performedOn={workout.performedOn}
          summary={summary.data}
          unit={unit}
          pending={summary.pending}
          onDone={() => {
            if (summary.pending) shell.showToast(...PENDING_TOAST);
            else shell.showToast("Treino salvo", { tone: "success", message: "Já está no seu histórico." });
            router.replace("/");
          }}
          onOpenHistory={() => {
            // Finalizado sem internet: o treino entra no histórico quando a fila sincronizar.
            if (summary.pending) shell.showToast(...PENDING_TOAST);
            router.replace(historyAnchorPath());
          }}
          onShare={() => setSharing(true)}
        />
        {/* Demonstração (sem gravar): os stories usam o mock. */}
        <ShareStorySheet
          open={sharing}
          sessionId={workout.id}
          mockScenario={persist ? null : "padrao"}
          onClose={() => setSharing(false)}
          onSaved={() => shell.showToast(...STORY_SAVED_TOAST)}
        />
      </>
    );
  }

  const resting = Boolean(current.rest);
  const menuExercise = sheet?.kind === "exercise-menu" ? state.exercises.find((e) => e.id === sheet.exerciseId) : undefined;
  const noteTitle =
    sheet?.kind === "note"
      ? sheet.target === "workout"
        ? "Treino de hoje"
        : state.exercises.find((e) => e.id === sheet.target)?.name
      : undefined;

  return (
    <>
      <main
        className={cn(
          // relative: referência do card que sai da lista (AnimatePresence popLayout).
          "relative flex min-h-dvh flex-col gap-3 px-4",
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
        {offline ? (
          <Banner tone="warning" title="Sem conexão">
            seu treino está salvo no aparelho
          </Banner>
        ) : (
          persist &&
          source === "device" &&
          outbox.pending > 0 && (
            <Banner tone="info" title="Sincronizando">
              enviando as alterações feitas sem internet.
            </Banner>
          )
        )}

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
                  poppedKey={popped}
                  editing={edit?.exerciseId === ex.id ? { setIndex: edit.setIndex, field: edit.field } : null}
                  holdProps={reorder.holdProps(ex.id)}
                  reorder={
                    reorder.active
                      ? {
                          index: i,
                          total: list.length,
                          dragging: reorder.draggingId === ex.id,
                          dragOffset: reorder.dragOffset,
                        }
                      : undefined
                  }
                  onToggleOpen={() => dispatch({ type: "toggleOpen", exerciseId: ex.id })}
                  onOpenMenu={() => setSheet({ kind: "exercise-menu", exerciseId: ex.id })}
                  onOpenNote={() => openNote(ex.id)}
                  onAddSet={() => addSet(ex)}
                  onToggleSet={(si) => toggleSet(i, si)}
                  onCycleType={(si) => cycleType(ex, si)}
                  onEditField={(si, field) => setEdit({ exerciseId: ex.id, setIndex: si, field })}
                  onRemoveSet={(si) => removeSet(ex, si)}
                />
              </LayoutItem>
            ))}
          </AnimatePresence>
        </div>

        {!reorder.active && (
          <AddExerciseButton onClick={() => setPicker({ mode: "treino" })} />
        )}
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

      <SetEditSheet
        open={Boolean(edit && editSet)}
        title={editTitle}
        set={editSet}
        field={edit?.field ?? "weightKg"}
        unit={unit}
        onFieldChange={(field) => setEdit((e) => (e ? { ...e, field } : e))}
        onValueChange={(field, value) =>
          edit &&
          dispatch({
            type: "setField",
            exerciseId: edit.exerciseId,
            setIndex: edit.setIndex,
            field,
            // Carga digitada na unidade do usuário; o estado (e o banco) guardam kg.
            value: field === "weightKg" ? (fromDisplayWeight(value, unit) ?? 0) : value,
          })
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

      <BottomSheet
        placement="screen"
        open={sheet?.kind === "workout-menu"}
        onClose={() => setSheet(null)}
        title="Treino"
        subtitle={workout.name}
      >
        <SheetOption
          icon={NotepadText}
          title="Observação do treino"
          subtitle={state.note || "Sem observação"}
          onClick={() => openNote("workout")}
        />
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
          icon={NotepadText}
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

      {/* Finalizando: cartão "Salvando treino" (loading 07) até o resumo aparecer. */}
      <SavingOverlay open={finishing} title="Salvando treino" message="Leva só um instante." variant={7} />
      <ConfirmDialog
        placement="screen"
        open={dialog === "finish" && !finishing}
        title="Finalizar treino?"
        message={finishWorkoutMessage(allSets.length - doneCount)}
        cancelLabel="Continuar"
        confirmLabel="Finalizar"
        onCancel={() => setDialog(null)}
        onConfirm={confirmFinish}
      />
      <ConfirmDialog
        placement="screen"
        open={dialog === "update-routine" && !finishing}
        title="Atualizar a rotina?"
        message={`Os exercícios e as séries deste treino passam a ser os da rotina ${workout.name}, para o próximo treino começar igual a este.`}
        cancelLabel="Manter rotina"
        confirmLabel="Atualizar rotina"
        balanced
        onCancel={() => void finish(false)}
        onConfirm={() => void finish(true)}
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
          persist={persist}
          onClose={() => setPicker(null)}
          onConfirm={(list) => void onPicked(list)}
        />
      )}
    </>
  );
}
