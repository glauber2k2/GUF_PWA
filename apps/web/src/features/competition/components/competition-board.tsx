"use client";

import type { ReactNode } from "react";
import { Timer } from "lucide-react";
import { seasonOf, toLocalISODate } from "@guf/core";
import { Banner, Icon, Skeleton } from "@/shared/components/ds";
import { CompetitionFilters, periodCaption } from "@/features/competition/components/competition-filters";
import { CompetitionRules } from "@/features/competition/components/competition-rules";
import type { CompetitionFiltersState } from "@/features/competition/hooks/use-competition-filters";
import { TOUR_TARGETS } from "@/features/onboarding";

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

/** "Termina em 12 dias" · "1 jul – 18 out" (abaixo do título das telas de competição). */
export function PeriodCaption({ filters }: { filters: CompetitionFiltersState }) {
  return (
    <p className="m-0 flex items-center gap-1.5 text-sm leading-5 text-fg-secondary">
      <Icon icon={Timer} size={16} className="text-accent-text" />
      <span>{periodCaption(filters.period, filters.range, filters.today)}</span>
    </p>
  );
}

/** Situação das consultas da tela (cada tela junta as suas). */
export interface BoardStatus {
  isPending: boolean;
  isError: boolean;
  error: { message: string } | null;
  refetch: () => void;
}

interface CompetitionBoardProps {
  filters: CompetitionFiltersState;
  status: BoardStatus;
  /** Sem com quem comparar (só você): mostra `empty`. */
  isAlone: boolean;
  empty: ReactNode;
  children: ReactNode;
}

/**
 * Corpo comum das telas de competição: filtros, carregando/erro, o conteúdo de cada tela e as regras.
 * Não conhece os dados: cada tela informa a situação das próprias consultas.
 */
export function CompetitionBoard({ filters, status, isAlone, empty, children }: CompetitionBoardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div data-tour={TOUR_TARGETS.competitionFilters}>
        <CompetitionFilters
          period={filters.period}
          metric={filters.metric}
          custom={filters.custom}
          today={filters.today}
          onPeriod={filters.changePeriod}
          onMetric={filters.setMetric}
        />
      </div>

      {status.isPending ? (
        <CompetitionSkeleton />
      ) : status.isError ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={status.refetch}>
          {status.error?.message ?? "Não foi possível carregar a competição. Verifique a internet e tente de novo."}
        </Banner>
      ) : isAlone ? (
        empty
      ) : (
        children
      )}

      <div data-tour={TOUR_TARGETS.competitionRules}>
        <CompetitionRules season={toLocalISODate(seasonOf(filters.today))} />
      </div>
    </div>
  );
}
