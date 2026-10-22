"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  currentWeek,
  formatLongDate,
  fromLocalISODate,
  greeting,
  routineLetter,
  routineMeta,
  todayPlan,
  toLocalISODate,
} from "@guf/core";
import type { HomeSummary } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { summaryPath } from "@/features/evolution";
import { newRoutinePathFor } from "@/features/projects";
import { Avatar, Banner, BottomSheet, SheetOption } from "@/shared/components/ds";
import { HISTORY_ANCHOR, HistorySection } from "@/features/history";
import { prefersReducedMotion } from "@/shared/helpers/motion";
import { useDevHomeState } from "@/features/home/hooks/use-dev-home-state";
import { useHomeSummary } from "@/features/home/api/use-home-summary";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { useAuth } from "@/features/auth";
import { HomeSkeleton } from "@/features/home/components/home-skeleton";
import { TodayCard, type TodayCardState } from "@/features/home/components/today-card";
import { WeekCard } from "@/features/home/components/week-card";
import { TOUR_TARGETS } from "@/features/onboarding";

type Sheet = { kind: "swap" } | null;

/**
 * Estado do card "Treino de hoje":
 * em andamento > concluído hoje > treino de hoje do projeto ativo (pelos dias da semana; sem dias
 * marcados, a próxima pela ordem) ou dia de descanso > sem plano > usuário novo.
 */
function todayState(data: HomeSummary, today: string): TodayCardState {
  if (data.inProgress) return { kind: "in_progress", session: data.inProgress };
  const todaySessions = data.weekSessions.filter((s) => s.performedOn === today);
  if (todaySessions.length > 0) return { kind: "done", sessions: todaySessions };
  const project = data.activeProject;
  if (project) {
    const date = fromLocalISODate(today);
    const plan = todayPlan(project.routines, data.lastFinishedRoutineId, date);
    if (plan.kind === "scheduled" || plan.kind === "sequence") return { kind: "planned", projectName: project.name, routine: plan.routine };
    if (plan.kind === "rest") return { kind: "rest", projectName: project.name, next: plan.next, today: date };
  }
  return data.hasAnyRoutine ? { kind: "empty" } : { kind: "new" };
}

/** "Esta semana" leva ao histórico, que fica logo abaixo na própria Início. */
function scrollToHistory() {
  document.getElementById(HISTORY_ANCHOR)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/** `topSlot`: conteúdo de outra feature logo abaixo da saudação (ex.: faixa de comunicado), composto na rota. */
export function HomeScreen({ topSlot }: { topSlot?: ReactNode }) {
  const { user } = useAuth();
  const shell = useAppShell();
  const dev = useDevHomeState();
  const online = useOnlineStatus();
  const summary = useHomeSummary();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const closeSheet = () => setSheet(null);

  const now = new Date();
  const today = toLocalISODate(now);
  // A saudação usa o relógio atual; a semana (dom–sáb) usa a data local de hoje.
  const week = useMemo(() => currentWeek(fromLocalISODate(today)), [today]);

  const offline = dev.forceOffline || !online;
  const loading = dev.forceLoading || summary.isPending;
  const data = summary.data;


  return (
    <main className="flex flex-col gap-4 px-4 pt-[env(safe-area-inset-top)]">
      {offline && (
        <div className="mt-2 animate-guf-rise-fast">
          <Banner tone="warning" title="Sem conexão">
            Mostrando os dados salvos no aparelho.
          </Banner>
        </div>
      )}

      {loading ? (
        <HomeSkeleton />
      ) : summary.isError || !data ? (
        <div className="pt-6">
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void summary.refetch()}>
            {summary.error?.message ?? "Não foi possível carregar. Verifique a internet e tente de novo."}
          </Banner>
        </div>
      ) : (
        <HomeContent
          data={data}
          today={today}
          now={now}
          week={week}
          userEmail={user?.email ?? null}
          onOpenSheet={setSheet}
          onSelectDay={setOpenDay}
          topSlot={topSlot}
        />
      )}

      <HistorySection openDay={openDay} onOpenDayChange={setOpenDay} />

      {data && <SwapSheet open={sheet?.kind === "swap"} data={data} today={today} onClose={closeSheet} onPick={(r) => shell.startWorkout(r)} />}
    </main>
  );
}

function HomeContent({
  data,
  today,
  now,
  week,
  userEmail,
  onOpenSheet,
  onSelectDay,
  topSlot,
}: {
  data: HomeSummary;
  today: string;
  now: Date;
  week: ReturnType<typeof currentWeek>;
  userEmail: string | null;
  onOpenSheet: (sheet: Sheet) => void;
  onSelectDay: (iso: string) => void;
  topSlot?: ReactNode;
}) {
  const shell = useAppShell();
  const router = useRouter();
  // Calendário pela RPC get_training_days (dias com treino concluído).
  const trainedDays = new Set(data.trainingDays.map((d) => d.performedOn));

  return (
    <>
      <header className="flex animate-guf-rise items-center justify-between gap-3 px-1 pt-4 pb-1">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="m-0 truncate text-[28px] leading-[34px] font-bold tracking-[-0.02em]">{greeting(now, data.profile.name)}</h1>
          <span className="text-sm leading-5 text-fg-secondary">{formatLongDate(now)}</span>
        </div>
        <button
          type="button"
          aria-label="Abrir perfil"
          onClick={() => router.push("/perfil")}
          className="flex-none cursor-pointer rounded-pill transition-transform duration-100 ease-standard active:scale-[.94] motion-reduce:active:scale-100"
        >
          <Avatar src={data.profile.avatarUrl} name={data.profile.name} email={userEmail} />
        </button>
      </header>

      {topSlot}

      <div data-tour={TOUR_TARGETS.todayCard} className="animate-guf-rise [animation-delay:80ms]">
        <TodayCard
          state={todayState(data, today)}
          actions={{
            onResume: (sessionId) => shell.openWorkout(sessionId),
            onStartPlanned: (routine) => shell.startWorkout(routine),
            onSwapRoutine: () => onOpenSheet({ kind: "swap" }),
            onStartEmpty: () => shell.startWorkout(null),
            onChooseRoutine: shell.openStartSheet,
            // Todo usuário tem projeto (Favoritos): cria a rotina direto no projeto ativo.
            onCreateRoutine: () => router.push(newRoutinePathFor(data.activeProject?.id)),
            // Vários treinos hoje: abre o mais recente.
            onOpenSummary: () => {
              const last = data.weekSessions.filter((s) => s.performedOn === today).at(-1);
              if (last) router.push(summaryPath(last.id));
            },
          }}
        />
      </div>

      <div data-tour={TOUR_TARGETS.weekCard} className="animate-guf-rise [animation-delay:160ms]">
        <WeekCard
          week={week}
          trainedDays={trainedDays}
          count={data.streak.currentWeekCount}
          goal={data.profile.weeklyGoal}
          onOpenHistory={scrollToHistory}
          onSelectDay={onSelectDay}
        />
      </div>
    </>
  );
}

/** "Trocar rotina": rotinas do projeto ativo; escolher uma já inicia o treino (como no design). */
function SwapSheet({
  open,
  data,
  today,
  onClose,
  onPick,
}: {
  open: boolean;
  data: HomeSummary;
  today: string;
  onClose: () => void;
  onPick: (routine: { id: string; name: string }) => void;
}) {
  const project = data.activeProject;
  const state = todayState(data, today);
  const currentId = state.kind === "planned" ? state.routine.id : null;
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Trocar rotina" subtitle={project?.name}>
      {project?.routines.map((r) => (
        <SheetOption
          key={r.id}
          letter={routineLetter(r.name)}
          title={r.name}
          subtitle={r.id === currentId ? `Hoje · ${routineMeta(r.exercises, r.averageDurationSeconds)}` : routineMeta(r.exercises, r.averageDurationSeconds)}
          highlighted={r.id === currentId}
          onClick={() => {
            onClose();
            onPick(r);
          }}
        />
      ))}
    </BottomSheet>
  );
}
