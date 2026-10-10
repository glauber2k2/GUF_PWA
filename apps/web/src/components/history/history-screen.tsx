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
import { useAppShell } from "@/components/app-shell/app-shell";
import { AppHeader, Banner, LargeTitle } from "@/components/ds";
import { useDevHistoryState } from "@/hooks/use-dev-history-state";
import { useHistoryOverview, useMonthTrainingDays } from "@/hooks/use-history";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useScrolled } from "@/hooks/use-scrolled";
import { DaySheet } from "./day-sheet";
import { HistorySkeleton } from "./history-skeleton";
import { HistoryStreakCard } from "./history-streak-card";
import { TrainingCalendar } from "./training-calendar";
import { useHistoryParams } from "./use-history-params";
import { VolumeChart } from "./volume-chart";

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
          <HistoryContent overview={overview.data.value} today={today} openLatestDay={dev.openDay} />
        )}
      </div>
    </main>
  );
}

function HistoryContent({ overview, today, openLatestDay }: { overview: HistoryOverview; today: Date; openLatestDay: boolean }) {
  const shell = useAppShell();
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
        onOpenSession={() => {
          setOpenDay(null);
          shell.showToast("O resumo do treino chega em breve");
        }}
      />
    </>
  );
}
