"use client";

import { useMemo, useState } from "react";
import {
  calendarTertiles,
  fromLocalISODate,
  monthsBack,
  recentWeeksStrip,
  shiftMonth,
  startOfMonthOf,
  toLocalISODate,
  weeksWithVolume,
  type ChartPeriod,
} from "@guf/core";
import type { HistoryOverview } from "@guf/api";
import { useRouter } from "next/navigation";
import { Search, TrendingUp } from "lucide-react";
import { AppHeader, Banner, Icon, LargeTitle } from "@/shared/components/ds";
import { exerciseSearchPath, summaryPath } from "@/features/evolution";
import { useDevHistoryState } from "@/features/history/hooks/use-dev-history-state";
import { useHistoryOverview, useMonthTrainingDays } from "@/features/history/api/use-history";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { useScrolled } from "@/shared/hooks/use-scrolled";
import { DaySheet } from "@/features/history/components/day-sheet";
import { HistorySkeleton } from "@/features/history/components/history-skeleton";
import { HistoryStreakCard } from "@/features/history/components/history-streak-card";
import { TrainingCalendar } from "@/features/history/components/training-calendar";
import { useHistoryParams } from "@/features/history/hooks/use-history-params";
import { VolumeChart } from "@/features/history/components/volume-chart";

/** Tela Histórico: sequência de semanas, calendário de dias treinados e evolução do volume. */
export function HistoryScreen() {
  const dev = useDevHistoryState();
  const online = useOnlineStatus();
  const scrolled = useScrolled();
  const overview = useHistoryOverview();
  const todayIso = toLocalISODate(new Date());
  const today = useMemo(() => fromLocalISODate(todayIso), [todayIso]);

  const offline = dev.forceOffline || !online || overview.data?.source === "device";
  const loading = dev.forceLoading || overview.isPending;

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 pt-[env(safe-area-inset-top)]">
        <AppHeader title="Histórico" collapsed={scrolled} />
      </div>
      <LargeTitle className="mt-1">Histórico</LargeTitle>

      <div className="flex flex-col gap-4">
        {offline && (
          <Banner tone="warning" title="Sem conexão" className="animate-guf-rise-fast">
            mostrando o último histórico salvo
          </Banner>
        )}
        {loading ? (
          <HistorySkeleton />
        ) : overview.isError || !overview.data ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void overview.refetch()} className="animate-guf-rise-fast">
            Não foi possível carregar o histórico. Verifique a internet e tente de novo.
          </Banner>
        ) : (
          <>
            {overview.data.value.firstTrainedOn && <EvolutionShortcut />}
            <HistoryContent overview={overview.data.value} today={today} openLatestDay={dev.openDay} />
          </>
        )}
      </div>
    </main>
  );
}

/** Atalho "Ver evolução de um exercício" (abre a busca de exercícios já feitos). */
function EvolutionShortcut() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(exerciseSearchPath())}
      className="flex h-12 flex-none animate-guf-rise cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-surface pr-3 pl-3.5 text-left text-[15px] text-fg-secondary transition-colors duration-150 ease-standard hover:bg-surface-3 active:scale-[.98] motion-reduce:active:scale-100"
    >
      <Icon icon={TrendingUp} size={18} className="text-accent-text" />
      <span className="flex-1">Ver evolução de um exercício</span>
      <Icon icon={Search} size={18} className="text-fg-muted" />
    </button>
  );
}

function HistoryContent({ overview, today, openLatestDay }: { overview: HistoryOverview; today: Date; openLatestDay: boolean }) {
  const router = useRouter();
  const { month, period, setMonth, setPeriod } = useHistoryParams(today);
  const monthDays = useMonthTrainingDays(month);
  const [direction, setDirection] = useState<"back" | "forward" | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(() => (openLatestDay ? (overview.trainingDays.at(-1)?.performedOn ?? null) : null));

  const { trainingDays, streak, weeklyGoal, weightUnit, firstTrainedOn } = overview;
  const strip = useMemo(() => recentWeeksStrip(trainingDays, today), [trainingDays, today]);
  const tertiles = useMemo(() => calendarTertiles(trainingDays, today), [trainingDays, today]);
  const fewData = useMemo(() => weeksWithVolume(trainingDays) < 2, [trainingDays]);

  // Calendário vai do mês do primeiro treino até o mês atual.
  const firstMonth = firstTrainedOn ? startOfMonthOf(fromLocalISODate(firstTrainedOn)) : startOfMonthOf(today);
  const changeMonth = (delta: -1 | 1) => {
    setDirection(delta === -1 ? "back" : "forward");
    setMonth(shiftMonth(month, delta));
  };

  return (
    <>
      <div className="animate-guf-rise">
        <HistoryStreakCard streak={streak} goal={weeklyGoal} weeks={strip} />
      </div>
      <div className="animate-guf-rise [animation-delay:60ms]">
        <TrainingCalendar
          month={month}
          today={today}
          days={monthDays.data?.value}
          tertiles={tertiles}
          unit={weightUnit}
          empty={firstTrainedOn === null}
          canGoBack={month > firstMonth}
          canGoForward={monthsBack(month, today) > 0}
          direction={direction}
          onChangeMonth={changeMonth}
          onSelectDay={setOpenDay}
        />
      </div>
      {monthDays.isError && (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void monthDays.refetch()}>
          Não foi possível carregar este mês. Verifique a internet e tente de novo.
        </Banner>
      )}
      <div className="animate-guf-rise [animation-delay:120ms]">
        <VolumeChart
          days={trainingDays}
          today={today}
          unit={weightUnit}
          period={period}
          onPeriodChange={(p: ChartPeriod) => setPeriod(p)}
          fewData={fewData}
        />
      </div>

      <DaySheet
        iso={openDay}
        unit={weightUnit}
        onClose={() => setOpenDay(null)}
        onOpenSession={(session) => {
          setOpenDay(null);
          router.push(summaryPath(session.id));
        }}
      />
    </>
  );
}
