"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Timer, UserPlus, Users } from "lucide-react";
import {
  chartBuckets,
  competitionRange,
  cumulativeSeries,
  formatNumber,
  rankCompetitors,
  seasonOf,
  toDisplayWeight,
  toLocalISODate,
  type CompetitionMetric,
  type CompetitionPeriod,
  type CompetitionRange,
} from "@guf/core";
import { AppHeader, Banner, EmptyState, Icon, Skeleton } from "@/shared/components/ds";
import { useScrolled } from "@/shared/hooks/use-scrolled";
import { useProfile } from "@/features/profile";
import { useCompetitionBoard } from "@/features/competition/api/use-competition";
import { METRICS } from "@/features/competition/constants/competition-labels";
import { CompetitionFilters, periodCaption } from "@/features/competition/components/competition-filters";
import { PositionCard } from "@/features/competition/components/position-card";
import { DuelCard, Podium, RankingList } from "@/features/competition/components/competition-ranking";
import { RaceChart } from "@/features/competition/components/race-chart";
import { CompetitionRules } from "@/features/competition/components/competition-rules";

function CompetitionSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-[260px] w-full rounded-lg" />
      <Skeleton className="h-[220px] w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

/**
 * Competição (protótipo "Competição"): você e quem vocês se seguem mutuamente. Pontos pela regra do
 * servidor (constância, esforço e sequência); volume, treinos e recordes como comparação.
 */
export function CompetitionScreen() {
  const scrolled = useScrolled();
  const router = useRouter();
  const params = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<CompetitionPeriod>("month");
  const [metric, setMetric] = useState<CompetitionMetric>("points");
  const [custom, setCustom] = useState<CompetitionRange>(() => competitionRange("3m", today));
  const [rivalChoice, setRivalChoice] = useState<string | null>(params.get("rival"));
  const range = period === "custom" ? custom : competitionRange(period, today);
  const board = useCompetitionBoard(range);
  const unit = useProfile().data?.weightUnit ?? "kg";

  const ranking = useMemo(
    () => (board.data ? rankCompetitors(board.data.participants, board.data.weeks, board.data.days, metric, range) : []),
    [board.data, metric, range],
  );
  const toDisplay = (value: number) => (metric === "volume" ? (toDisplayWeight(value, unit) ?? 0) : value);
  const format = (value: number) => formatNumber(toDisplay(value), 0);
  const formatVolume = (value: number) => formatNumber(toDisplayWeight(value, unit) ?? 0, 0);
  const unitLabel = metric === "volume" ? unit : METRICS[metric].unit;

  const me = ranking.find((c) => c.isMe);
  const meIndex = ranking.findIndex((c) => c.isMe);
  const fallbackRival = ranking[meIndex - 1] ?? ranking[meIndex + 1] ?? null;
  const rival = ranking.find((c) => c.userId === rivalChoice && !c.isMe) ?? (fallbackRival && !fallbackRival.isMe ? fallbackRival : null);
  const buckets = chartBuckets(range);
  const lines = board.data
    ? ranking.map((competitor) => ({
        competitor,
        values: cumulativeSeries(competitor.userId, board.data.weeks, board.data.days, metric, buckets.dates),
      }))
    : [];
  const loading = board.isPending;

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 h-0 overflow-visible pt-[env(safe-area-inset-top)]">
        {scrolled && (
          <AppHeader
            title="Competição"
            collapsed
            trailing={
              <Link href="/buscar-pessoas" aria-label="Convidar amigos" className="grid size-11 place-items-center rounded-md text-fg">
                <Icon icon={UserPlus} size={20} />
              </Link>
            }
          />
        )}
      </div>
      <header className="flex items-center justify-between gap-3 pt-5 pb-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.02em]">Competição</h1>
          <p className="m-0 flex items-center gap-1.5 text-sm leading-5 text-fg-secondary">
            <Icon icon={Timer} size={16} className="text-accent-text" />
            <span>{periodCaption(period, range, today)}</span>
          </p>
        </div>
        <Link
          href="/buscar-pessoas"
          aria-label="Convidar amigos"
          className="grid size-11 flex-none place-items-center rounded-md border border-border-strong bg-surface-3 text-fg hover:bg-surface-elevated"
        >
          <Icon icon={UserPlus} size={20} />
        </Link>
      </header>

      <div className="flex flex-col gap-4">
        <CompetitionFilters
          period={period}
          metric={metric}
          custom={custom}
          today={today}
          onPeriod={(next, nextCustom) => {
            if (nextCustom) setCustom(nextCustom);
            setPeriod(next);
          }}
          onMetric={setMetric}
        />

        {loading ? (
          <CompetitionSkeleton />
        ) : board.isError || !me ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void board.refetch()}>
            {board.error?.message ?? "Não foi possível carregar a competição. Verifique a internet e tente de novo."}
          </Banner>
        ) : ranking.length === 1 ? (
          <EmptyState
            icon={Users}
            title="Chame alguém para competir"
            message="A competição começa quando você e outra pessoa se seguem mutuamente. Encontre amigos ou mande o link do seu perfil."
            actionLabel="Encontrar pessoas"
            onAction={() => router.push("/buscar-pessoas")}
          />
        ) : (
          <>
            <PositionCard ranking={ranking} metric={metric} unit={unitLabel} format={format} />
            <Podium ranking={ranking} label={METRICS[metric].label} format={format} />
            <RaceChart lines={lines} dates={buckets.dates} rivalId={rival?.userId ?? null} caption={METRICS[metric].accumulated} format={format} />
            <RankingList ranking={ranking} rivalId={rival?.userId ?? null} unit={unitLabel} format={format} onSelect={setRivalChoice} />
            {rival && <DuelCard me={me} rival={rival} candidates={ranking.filter((c) => !c.isMe)} formatVolume={formatVolume} onPick={setRivalChoice} />}
          </>
        )}

        <CompetitionRules range={range} season={toLocalISODate(seasonOf(today))} />
      </div>
    </main>
  );
}
