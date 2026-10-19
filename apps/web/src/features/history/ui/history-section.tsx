"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Banner, Icon } from "@/shared/components/ds";
import { exerciseSearchPath, summaryPath } from "@/features/evolution";
import { useDevHistoryState } from "@/features/history/hooks/use-dev-history-state";
import { useHistoryOverview, useMonthTrainingDays } from "@/features/history/api/use-history";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { DaySheet } from "@/features/history/components/day-sheet";
import { HistorySkeleton } from "@/features/history/components/history-skeleton";
import { HistoryStreakCard } from "@/features/history/components/history-streak-card";
import { TrainingCalendar } from "@/features/history/components/training-calendar";
import { useHistoryParams } from "@/features/history/hooks/use-history-params";
import { VolumeChart } from "@/features/history/components/volume-chart";
import { HISTORY_ANCHOR } from "@/features/history/helpers/paths";
import { TOUR_TARGETS } from "@/features/onboarding";

export interface HistorySectionProps {
  /** Dia aberto na folha ("yyyy-MM-dd"); a Início também abre pelos dias de "Esta semana". */
  openDay: string | null;
  onOpenDayChange: (iso: string | null) => void;
}

/**
 * Histórico dentro da Início: sequência de semanas, calendário de dias treinados e evolução do
 * volume. O aviso de sem conexão fica com a Início; aqui só o caso de cópia antiga com internet.
 */
export function HistorySection({ openDay, onOpenDayChange }: HistorySectionProps) {
  const dev = useDevHistoryState();
  const online = useOnlineStatus();
  const overview = useHistoryOverview();
  const todayIso = toLocalISODate(new Date());
  const today = useMemo(() => fromLocalISODate(todayIso), [todayIso]);

  const staleCopy = online && !dev.forceOffline && overview.data?.source === "device";
  const loading = dev.forceLoading || overview.isPending;

  return (
    <div className="flex flex-col gap-4">
      {staleCopy && (
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
        <HistoryContent
          overview={overview.data.value}
          today={today}
          openLatestDay={dev.openDay}
          openDay={openDay}
          onOpenDayChange={onOpenDayChange}
        />
      )}
    </div>
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

function HistoryContent({
  overview,
  today,
  openLatestDay,
  openDay,
  onOpenDayChange,
}: HistorySectionProps & { overview: HistoryOverview; today: Date; openLatestDay: boolean }) {
  const router = useRouter();
  const { month, period, setMonth, setPeriod } = useHistoryParams(today);
  const monthDays = useMonthTrainingDays(month);
  const [direction, setDirection] = useState<"back" | "forward" | null>(null);

  const { trainingDays, streak, weeklyGoal, weightUnit, firstTrainedOn } = overview;
  const strip = useMemo(() => recentWeeksStrip(trainingDays, today), [trainingDays, today]);
  const tertiles = useMemo(() => calendarTertiles(trainingDays, today), [trainingDays, today]);
  const fewData = useMemo(() => weeksWithVolume(trainingDays) < 2, [trainingDays]);
  const latestDay = trainingDays.at(-1)?.performedOn ?? null;

  // ?estado=dia (só dev): abre a folha do dia treinado mais recente uma vez.
  useEffect(() => {
    if (openLatestDay && latestDay) onOpenDayChange(latestDay);
  }, [openLatestDay, latestDay, onOpenDayChange]);

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

      <h2 id={HISTORY_ANCHOR} data-tour={TOUR_TARGETS.history} className="m-0 scroll-mt-4 px-1 pt-2 text-xl leading-[26px] font-bold tracking-[-0.01em]">
        Histórico
      </h2>
      {firstTrainedOn && <EvolutionShortcut />}
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
          onSelectDay={onOpenDayChange}
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
        onClose={() => onOpenDayChange(null)}
        onOpenSession={(session) => {
          onOpenDayChange(null);
          router.push(summaryPath(session.id));
        }}
      />
    </>
  );
}
