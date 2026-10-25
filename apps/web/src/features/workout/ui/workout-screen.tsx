"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudOff, Dumbbell, Flag, NotepadText, Play, Timer, Trash2 } from "lucide-react";
import {
  finishWorkout,
  updateRoutineFromWorkout,
  getExerciseContext,
  isNetworkError,
  type ActiveWorkout,
  type ExerciseContext,
  type FinishedWorkoutSummary,
  type WorkoutSet,
} from "@guf/api";
import {
  completedVolume,
  finishWorkoutMessage,
  formatElapsed,
  muscleLevelsFromWorkout,
  nextSetLabel,
  pickSetValues,
  setsProgressLabel,
  toLocalISODate,
  volumeLabel,
} from "@guf/core";
import { useAppShell, type ToastOptions } from "@/features/app-shell";
import { BOTTOM_BAR_PROPS } from "@/shared/hooks/use-bottom-clearance";
import {
  Banner,
  BottomSheet,
  Button,
  ConfirmDialog,
  EmptyState,
  RestTimer,
  RestTimerBar,
  SavingOverlay,
  SheetOption,
  SkeletonCard,
} from "@/shared/components/ds";
import { historyAnchorPath } from "@/features/history";
import { ShareStorySheet, STORY_SAVED_TOAST } from "@/features/share";
import { useCardioStopwatch } from "@/features/workout/hooks/use-cardio-stopwatch";
import { useDevWorkoutState, type DevWorkoutFlag } from "@/features/workout/hooks/use-dev-workout-state";
import { useScreenToasts } from "@/features/workout/hooks/use-screen-toasts";
import { useWorkoutEditing, type WorkoutChangeSink } from "@/features/workout/hooks/use-workout-editing";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import type { OutboxOp } from "@/shared/offline/db";
import { dismissOutboxFailure, enqueue, flushOutbox, hasPendingFor, useOutboxStatus } from "@/shared/offline/outbox";
import { loadWorkout, removeWorkoutSnapshot, saveWorkoutSnapshot, type DataSource } from "@/shared/offline/workout-repo";
import { invalidatePlanningData, invalidateTrainingData } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";
import { cn } from "@/shared/helpers/class-names";
import { mockWorkoutApi } from "@/mocks/workout";
import { localSummary, toNewWorkoutExercise, withDeviceCardioRecords, workoutSnapshot } from "@/features/workout/helpers/workout-builders";
import { useActiveWorkout, useWorkoutClock, type ActiveWorkoutState } from "@/features/workout/providers/workout-provider";
import { WorkoutEditor } from "@/features/workout/components/workout-editor";
import { WorkoutHeader } from "@/features/workout/components/workout-header";
import { WorkoutSummary } from "@/features/workout/components/workout-summary";
import type { ExerciseView } from "@/features/workout/helpers/workout-state";

const WORKOUT_KEY = "workout";
/** Treino finalizado sem internet: fica no aparelho até a fila enviar. */
const PENDING_TOAST: [string, ToastOptions] = [
  "Treino salvo no aparelho",
  { tone: "warning", icon: CloudOff, message: "Ele aparece no histórico quando a internet voltar." },
];

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

type Sheet = { kind: "workout-menu" } | { kind: "timer" } | null;

interface WorkoutViewProps {
  workout: ActiveWorkout;
  source: DataSource;
  /** false = demonstração (não grava). */
  persist: boolean;
  offline: boolean;
  dev: ReadonlySet<DevWorkoutFlag>;
}

/** Cada alteração do treino em andamento vira uma operação da fila offline. */
function outboxSink(sessionId: string, queue: (op: OutboxOp) => void): WorkoutChangeSink {
  const saveSet = (sessionExerciseId: string, set: WorkoutSet) =>
    queue({
      kind: "saveSet",
      sessionId,
      sessionExerciseId,
      set: { id: set.id, setNumber: set.setNumber, setType: set.setType, ...pickSetValues(set), isCompleted: set.isCompleted },
    });
  return {
    saveSet,
    deleteSet: (setId) => queue({ kind: "deleteSet", sessionId, setId }),
    removeExercise: (sessionExerciseId) => queue({ kind: "removeExercise", sessionId, sessionExerciseId }),
    replaceExercise: (sessionExerciseId, exercise, position) =>
      queue({ kind: "replaceExercise", sessionId, sessionExerciseId, exercise: toNewWorkoutExercise(exercise, position) }),
    addExercises: (exercises, firstPosition) =>
      queue({ kind: "addExercises", sessionId, exercises: exercises.map((e, i) => toNewWorkoutExercise(e, firstPosition + i)) }),
    reorderExercises: (sessionExerciseIds) => queue({ kind: "reorderExercises", sessionId, sessionExerciseIds }),
    saveExerciseNote: (sessionExerciseId, note) => queue({ kind: "exerciseNote", sessionId, sessionExerciseId, note }),
    saveWorkoutNote: (note) => queue({ kind: "workoutNote", sessionId, note }),
  };
}

function WorkoutView({ workout, source, persist, offline, dev }: WorkoutViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const shell = useAppShell();
  const outbox = useOutboxStatus();
  const { active, track, clear, togglePause, startRest, adjustRest, toggleRestPause, skipRest, onRestEnd } = useActiveWorkout();
  const unit = workout.weightUnit;

  const [sheet, setSheet] = useState<Sheet>(() => (dev.has("timer") ? { kind: "timer" } : null));
  const [dialog, setDialog] = useState<"finish" | "update-routine" | "confirm-update-routine" | "discard" | null>(() => (dev.has("confirmar") ? "finish" : null));
  const [summary, setSummary] = useState<{ data: FinishedWorkoutSummary; pending: boolean } | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Relógio: o do provider (compartilhado com o mini card) ou, até registrar, o do próprio treino.
  const baseClock = { startedAt: workout.startedAt, periods: workout.activePeriods };
  const fallback: ActiveWorkoutState = { sessionId: workout.id, name: workout.name, clock: baseClock, rest: null, persist };
  const current = active?.sessionId === workout.id ? active : fallback;
  const { elapsed, paused, restLeft } = useWorkoutClock(summary ? null : current);

  const showToast = useScreenToasts();

  /** Grava pela fila offline (na demonstração, não grava nada). */
  const queue = useCallback(
    (op: OutboxOp) => {
      if (persist) void enqueue(op);
    },
    [persist],
  );
  const sink = useMemo(() => outboxSink(workout.id, queue), [workout.id, queue]);

  /** Contexto para montar exercícios novos (anterior, recorde, descanso); sem internet, vazio. */
  const loadContext = async (ids: string[]): Promise<Record<string, ExerciseContext>> => {
    if (offline) return {};
    const api = persist ? getExerciseContext : mockWorkoutApi.getExerciseContext;
    const { data } = await api(getSupabaseClient(), { exerciseIds: ids, routineId: workout.routineId });
    return data ?? {};
  };

  /** Série concluída: descanso do exercício, com a próxima série no rodapé. */
  const startRestAfter = (exercises: ExerciseView[], exerciseIndex: number, setIndex: number) => {
    const ex = exercises[exerciseIndex];
    if (!ex) return;
    const labels = exercises.map((e) => ({ exerciseName: e.name, muscleGroup: e.muscleGroup, sets: e.sets }));
    startRest(ex.restSeconds, nextSetLabel(labels, exerciseIndex, setIndex, unit));
  };

  const stopwatch = useCardioStopwatch(workout.id);
  const editing = useWorkoutEditing({
    initial: workout,
    unit,
    sink,
    showToast,
    loadContext,
    onSetCompleted: startRestAfter,
    initialEdit:
      dev.has("editando") && workout.exercises[0] ? { exerciseId: workout.exercises[0].id, setIndex: 0, field: "weightKg" } : null,
  });
  const { state } = editing;

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

  // Descanso no rodapé: a pilha de avisos sobe para não cobri-lo.

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

  const allSets = state.exercises.flatMap((e) => e.sets);
  const doneCount = allSets.filter((s) => s.isCompleted).length;
  const progressPct = allSets.length ? (doneCount / allSets.length) * 100 : 0;
  const volumeText = volumeLabel(completedVolume(allSets), unit);

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
          return setSummary({ data: withDeviceCardioRecords(data, local), pending: false });
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
          muscleLevels={muscleLevelsFromWorkout(state.exercises)}
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
          volumeText={volumeText}
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

        <WorkoutEditor
          editing={editing}
          workoutNoteTitle="Treino de hoje"
          exerciseNoteHint="Fica salva para os próximos treinos"
          offline={offline}
          persist={persist}
          stopwatch={stopwatch}
        />
      </main>

      {current.rest && (
        <div {...BOTTOM_BAR_PROPS} className="fixed inset-x-3 bottom-[calc(112px+env(safe-area-inset-bottom))] z-[12] mx-auto max-w-[406px] animate-guf-up">
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

      <footer {...BOTTOM_BAR_PROPS} className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/92 backdrop-blur-[12px]">
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
          onClick={() => {
            setSheet(null);
            editing.openNote("workout");
          }}
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
        onConfirm={() => setDialog("confirm-update-routine")}
      />
      {/* Atualizar substitui o que estava planejado na rotina: confirma antes (manter não muda nada). */}
      <ConfirmDialog
        placement="screen"
        open={dialog === "confirm-update-routine" && !finishing}
        title="Substituir a rotina?"
        message={`Os exercícios, as séries e as cargas planejadas de ${workout.name} serão trocados pelos deste treino. Não dá para desfazer.`}
        cancelLabel="Voltar"
        confirmLabel="Sim, atualizar"
        onCancel={() => setDialog("update-routine")}
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
    </>
  );
}
