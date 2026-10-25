"use client";

import { useState } from "react";
import { Info, ReceiptText } from "lucide-react";
import { POINT_SOURCE_LABELS, seasonMonthName, toLocalISODate } from "@guf/core";
import { Banner, EmptyState, Icon, SegmentedControl, Skeleton } from "@/shared/components/ds";
import { DetailHeader } from "@/shared/components/detail-header";
import { DetailScreen } from "@/shared/components/detail-screen";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { ScoringRulesSheet } from "@/features/competition/components/scoring-rules-sheet";
import { StatementMonthNav } from "@/features/competition/components/statement-month-nav";
import { StatementSummary } from "@/features/competition/components/statement-summary";
import { StatementWeekCard } from "@/features/competition/components/statement-week-card";
import { StatementYear } from "@/features/competition/components/statement-year";
import { usePointsStatementView, type PointsStatementView, type StatementView } from "@/features/competition/hooks/use-points-statement-view";

const VIEW_OPTIONS = [
  { value: "month", label: "Mês" },
  { value: "year", label: "Ano" },
];

function StatementSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando o extrato" className="flex flex-col gap-4">
      <Skeleton className="mx-auto h-20 w-40 rounded-md" />
      <Skeleton className="h-2.5 rounded-pill" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-48 rounded-lg" />
    </div>
  );
}

/** Mês: navegação, resumo com filtros e as semanas com cada treino. */
function MonthStatement({ view }: { view: PointsStatementView }) {
  const { rule, filter } = view;
  const counted = view.weeks.reduce((sum, w) => sum + w.days.filter((d) => d.outcome === "counted").length, 0);
  const isFilterEmpty = filter !== null && view.totals[filter] === 0;
  return (
    <>
      <StatementMonthNav
        season={view.season}
        today={view.today}
        isCurrent={view.isCurrent}
        canGoBack={view.canGoBack}
        onPrevious={view.previous}
        onNext={view.next}
      />
      <StatementSummary
        title={`Total em ${seasonMonthName(view.season).toLowerCase()}`}
        caption={counted === 1 ? "1 dia de treino que contou" : `${counted} dias de treino que contaram`}
        totals={view.totals}
        filter={filter}
        onToggleFilter={view.toggleFilter}
        onClearFilter={view.clearFilter}
      />
      {view.weeks.length === 0 ? (
        <EmptyState icon={ReceiptText} title="Nenhum ponto neste mês" message="Os pontos aparecem aqui quando você finaliza um treino de pelo menos 20 minutos." />
      ) : (
        rule &&
        view.weeks.map((week, i) => (
          <StatementWeekCard
            key={week.weekStart}
            week={week}
            rule={rule}
            filter={filter}
            isFirstWeek={i === 0}
            isOpen={view.isOpen}
            onToggle={view.toggleOpen}
          />
        ))
      )}
      {isFilterEmpty && <p className="m-0 text-center text-sm text-fg-muted">Nenhum ponto de {POINT_SOURCE_LABELS[filter].toLowerCase()} neste mês.</p>}
    </>
  );
}

/**
 * Extrato de pontos (/competicao/extrato · protótipo "Extrato de Pontos"): de onde veio cada ponto da
 * competição, por mês (temporada) ou ano, com filtro por origem. A regra é a do servidor; a tela só
 * distribui o que ele calculou.
 */
export function PointsStatementScreen() {
  const goBack = useGoBack("/competicao");
  const view = usePointsStatementView();
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <DetailScreen>
      <DetailHeader title="Extrato de pontos" onBack={goBack} menuIcon={Info} menuLabel="Como os pontos funcionam" onMenu={() => setRulesOpen(true)} />
      <div className="flex flex-col gap-5 pt-3">
        <SegmentedControl options={VIEW_OPTIONS} value={view.view} onChange={(v) => view.setView(v as StatementView)} label="Visualização" />
        {view.error ? (
          <Banner tone="danger" title="Não foi possível carregar o extrato." actionLabel="Tentar de novo" onAction={view.retry}>
            {view.error.message}
          </Banner>
        ) : view.isLoading ? (
          <StatementSkeleton />
        ) : view.view === "month" ? (
          <MonthStatement view={view} />
        ) : (
          <StatementYear year={view.today.getFullYear()} months={view.months} onOpenMonth={view.openSeason} />
        )}
        <button
          type="button"
          onClick={() => setRulesOpen(true)}
          className="flex cursor-pointer items-center gap-2.5 border-t border-border px-1 pt-3.5 text-left text-fg-muted"
        >
          <Icon icon={Info} size={18} />
          <span className="flex-1 text-xs leading-4 text-pretty">Os pontos são calculados pelo servidor quando o treino é finalizado. Aquecimento não conta no volume.</span>
          <span className="text-[13px] font-semibold whitespace-nowrap text-accent-text">Ver regras</span>
        </button>
      </div>
      <ScoringRulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} season={toLocalISODate(view.season)} />
    </DetailScreen>
  );
}
