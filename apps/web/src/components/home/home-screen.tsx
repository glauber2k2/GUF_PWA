"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  currentWeek,
  firstName,
  formatLongDate,
  formatShortDate,
  fromLocalISODate,
  greeting,
  suggestNextRoutine,
  toLocalISODate,
} from "@guf/core";
import type { HomeSummary } from "@guf/api";
import { routineLetter, routineMeta, useAppShell } from "@/components/app-shell/app-shell";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Banner, BottomSheet, Button, SheetOption, StatGrid } from "@/components/ds";
import { useDevHomeState } from "@/hooks/use-dev-home-state";
import { useHomeSummary } from "@/hooks/use-home-summary";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useAuth } from "@/providers/auth-provider";
import { HomeSkeleton } from "./home-skeleton";
import { StreakCard } from "./streak-card";
import { sessionStats, TodayCard, type TodayCardState } from "./today-card";
import { WeekCard } from "./week-card";

type Sheet = { kind: "swap" } | { kind: "day"; iso: string } | { kind: "account" } | null;

/** Estado do card "Treino de hoje" (concluído hoje > rotina sugerida > sem plano > novo). */
function todayState(data: HomeSummary, today: string): TodayCardState {
  const todaySessions = data.weekSessions.filter((s) => s.performedOn === today);
  if (todaySessions.length > 0) return { kind: "done", sessions: todaySessions };
  const project = data.activeProject;
  const suggested = project ? suggestNextRoutine(project.routines, data.lastFinishedRoutineId) : null;
  if (project && suggested) return { kind: "planned", projectName: project.name, routine: suggested };
  return data.hasAnyRoutine ? { kind: "empty" } : { kind: "new" };
}

export function HomeScreen() {
  const { user } = useAuth();
  const shell = useAppShell();
  const dev = useDevHomeState();
  const online = useOnlineStatus();
  const summary = useHomeSummary();
  const [sheet, setSheet] = useState<Sheet>(null);
  const closeSheet = () => setSheet(null);

  const now = new Date();
  const today = toLocalISODate(now);
  // A saudação usa o relógio atual; a semana (seg–dom) usa a data local de hoje.
  const week = useMemo(() => currentWeek(fromLocalISODate(today)), [today]);

  const offline = dev.forceOffline || !online;
  const loading = dev.forceLoading || summary.isPending;
  const data = summary.data;

  const soon = (what: string) => shell.showToast(`${what} chega em breve`);

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
          onSoon={soon}
        />
      )}

      {data && (
        <>
          <SwapSheet open={sheet?.kind === "swap"} data={data} today={today} onClose={closeSheet} onPick={(r) => shell.startWorkout(r)} />
          <DaySheet
            iso={sheet?.kind === "day" ? sheet.iso : null}
            data={data}
            onClose={closeSheet}
            onOpenSummary={() => soon("O resumo do treino")}
          />
        </>
      )}
      <BottomSheet placement="screen" open={sheet?.kind === "account"} onClose={closeSheet} title="Sua conta" subtitle={user?.email}>
        <p className="m-0 text-sm text-fg-secondary">A tela de Perfil chega em breve. Por enquanto, daqui você pode sair da conta.</p>
        <SignOutButton />
      </BottomSheet>
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
  onSoon,
}: {
  data: HomeSummary;
  today: string;
  now: Date;
  week: ReturnType<typeof currentWeek>;
  userEmail: string | null;
  onOpenSheet: (sheet: Sheet) => void;
  onSoon: (what: string) => void;
}) {
  const shell = useAppShell();
  const name = firstName(data.profile.name);
  const initial = (name ?? userEmail ?? "?").charAt(0).toUpperCase();
  const trainedDays = new Set(data.weekSessions.map((s) => s.performedOn));

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
          onClick={() => onOpenSheet({ kind: "account" })}
          className={[
            "grid size-11 flex-none cursor-pointer place-items-center rounded-pill border border-border-strong bg-surface-3",
            "text-base font-semibold text-fg transition-transform duration-100 ease-standard active:scale-[.94] motion-reduce:active:scale-100",
          ].join(" ")}
        >
          {initial}
        </button>
      </header>

      <div className="animate-guf-rise [animation-delay:80ms]">
        <TodayCard
          state={todayState(data, today)}
          actions={{
            onStartPlanned: (routine) => shell.startWorkout(routine),
            onSwapRoutine: () => onOpenSheet({ kind: "swap" }),
            onStartEmpty: () => shell.startWorkout(null),
            onChooseRoutine: shell.openStartSheet,
            onCreateRoutine: () => onSoon("A criação de rotinas"),
            onOpenSummary: () => onSoon("O resumo do treino"),
          }}
        />
      </div>

      <div className="animate-guf-rise [animation-delay:160ms]">
        <WeekCard
          week={week}
          trainedDays={trainedDays}
          count={data.streak.currentWeekCount}
          goal={data.profile.weeklyGoal}
          onOpenHistory={() => onSoon("O Histórico")}
          onSelectDay={(iso) => onOpenSheet({ kind: "day", iso })}
        />
      </div>

      <div className="animate-guf-rise [animation-delay:240ms]">
        <StreakCard streak={data.streak} goal={data.profile.weeklyGoal} />
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
          subtitle={r.id === currentId ? `Hoje · ${routineMeta(r)}` : routineMeta(r)}
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

/** Resumo de um dia treinado da semana (toque no dia). */
function DaySheet({
  iso,
  data,
  onClose,
  onOpenSummary,
}: {
  iso: string | null;
  data: HomeSummary;
  onClose: () => void;
  onOpenSummary: () => void;
}) {
  const sessions = iso ? data.weekSessions.filter((s) => s.performedOn === iso) : [];
  const names = sessions.map((s) => s.name).join(" · ");
  return (
    <BottomSheet
      placement="screen"
      open={sessions.length > 0}
      onClose={onClose}
      title={iso ? formatShortDate(fromLocalISODate(iso)) : undefined}
      subtitle={sessions.length > 1 ? `${sessions.length} treinos concluídos` : "Concluído"}
    >
      <span className="text-[15px] font-medium text-fg-secondary">{names}</span>
      <StatGrid stats={sessionStats(sessions)} className="pt-2 pb-1" />
      <Button variant="secondary" size="tall" iconRight={ChevronRight} fullWidth onClick={onOpenSummary}>
        Ver resumo completo
      </Button>
    </BottomSheet>
  );
}
