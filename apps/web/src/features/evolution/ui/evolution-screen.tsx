"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChartLine, ChevronRight, Trophy } from "lucide-react";
import {
  equipmentLabel,
  evolutionSeries,
  formatDayMonth,
  formatNumber,
  formatShortDate,
  fromLocalISODate,
  isEvolutionMetric,
  isEvolutionPeriod,
  muscleGroupLabel,
  personalBests,
  plural,
  TIMES_SIGN,
  toDisplayWeight,
  toLocalISODate,
  type EvolutionMetric,
  type EvolutionPeriod,
  type ExerciseSessionEvolution,
  type WeightUnit,
} from "@guf/core";
import type { ExerciseEvolution } from "@guf/api";
import { Banner, EmptyState, Icon } from "@/shared/components/ds";
import { useEvolutionSource, useExerciseEvolution } from "@/features/evolution/api/use-evolution";
import { useOnlineStatus } from "@/shared/hooks/use-online-status";
import { cn } from "@/shared/helpers/class-names";
import { DetailHeader } from "@/shared/components/detail-header";
import { EvolutionChart } from "@/features/evolution/components/evolution-chart";
import { EvolutionSkeleton } from "@/features/evolution/components/evolution-skeleton";
import { exerciseSearchPath, summaryPath } from "@/features/evolution/helpers/paths";
import { useGoBack } from "@/shared/hooks/use-go-back";

const RECENT_LIMIT = 8;

/** Evolução por exercício: /exercicio?id=<exercício>&metrica=carga|1rm|volume&periodo=3m|6m|1a|tudo. */
export function EvolutionScreen() {
  const params = useSearchParams();
  const exerciseId = params.get("id");
  const { dev } = useEvolutionSource();
  const evolution = useExerciseEvolution(exerciseId);
  const online = useOnlineStatus();
  const goBack = useGoBack(exerciseSearchPath());

  const loading = dev.forceLoading || (evolution.isPending && evolution.fetchStatus !== "idle");
  const data = evolution.data?.value;
  const offline = dev.forceOffline || !online || evolution.data?.source === "device";
  const missing = !loading && ((!exerciseId && !dev.scenario) || evolution.error?.code === "exercise_not_found");
  const subtitle = data ? [muscleGroupLabel(data.exercise.muscleGroup), equipmentLabel(data.exercise.equipment)].filter(Boolean).join(" · ") : null;

  return (
    <main className="flex flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom))]">
      <DetailHeader loading={loading} title={data?.exercise.name ?? "Evolução"} subtitle={subtitle} onBack={goBack} />
      <div className="flex flex-col gap-4 pt-2">
        {offline && !loading && (
          <Banner tone="warning" title="Sem conexão" className="animate-guf-rise-fast">
            mostrando os últimos dados salvos
          </Banner>
        )}
        {loading ? (
          <EvolutionSkeleton />
        ) : missing ? (
          <div className="mt-14 animate-guf-rise">
            <EmptyState icon={ChartLine} title="Exercício não encontrado" message="Este exercício não está mais disponível." actionLabel="Voltar" onAction={goBack} bordered={false} />
          </div>
        ) : !data ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void evolution.refetch()}>
            Não foi possível carregar a evolução. Verifique a internet e tente de novo.
          </Banner>
        ) : data.sessions.length === 0 ? (
          <div className="mt-14 animate-guf-rise">
            <EmptyState icon={ChartLine} title="Você ainda não fez este exercício." message="A evolução aparece depois do primeiro treino concluído." />
          </div>
        ) : (
          <EvolutionContent evolution={data} />
        )}
      </div>
    </main>
  );
}

/** Métrica e período ficam na URL (voltar/compartilhar mantém a escolha). */
function useEvolutionParams(): { metric: EvolutionMetric; period: EvolutionPeriod; set: (key: "metrica" | "periodo", value: string) => void } {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const m = params.get("metrica");
  const p = params.get("periodo");
  return {
    metric: isEvolutionMetric(m) ? m : "carga",
    period: isEvolutionPeriod(p) ? p : "3m",
    set: (key, value) => {
      const next = new URLSearchParams(params.toString());
      next.set(key, value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
  };
}

function EvolutionContent({ evolution }: { evolution: ExerciseEvolution }) {
  const { metric, period, set } = useEvolutionParams();
  const unit = evolution.weightUnit;
  const sessions = evolution.sessions;
  const todayIso = toLocalISODate(new Date());
  const series = useMemo(() => evolutionSeries(sessions, metric, period, fromLocalISODate(todayIso), unit), [sessions, metric, period, todayIso, unit]);
  const bests = personalBests(sessions);
  const last = sessions.at(-1);
  const single = sessions.length === 1;
  if (!bests || !last) return null;

  return (
    <>
      <RecordsSection bests={bests} unit={unit} single={single} />
      <EvolutionChart
        series={series}
        last={last}
        metric={metric}
        period={period}
        unit={unit}
        single={single}
        onMetricChange={(v) => set("metrica", v)}
        onPeriodChange={(v) => set("periodo", v)}
      />
      <RecentSessions sessions={sessions} unit={unit} />
    </>
  );
}

function RecordsSection({ bests, unit, single }: { bests: NonNullable<ReturnType<typeof personalBests>>; unit: WeightUnit; single: boolean }) {
  const router = useRouter();
  const load = (kg: number) => formatNumber(toDisplayWeight(kg, unit) ?? 0);
  const date = (s: ExerciseSessionEvolution) => formatDayMonth(fromLocalISODate(s.performedOn));
  const cards = [
    {
      label: "Maior carga",
      value: load(bests.load.maxWeightKg),
      sub: `${bests.load.repsAtMax ? `${TIMES_SIGN} ${bests.load.repsAtMax} · ` : ""}${date(bests.load)}`,
      session: bests.load,
      aria: `Maior carga: ${load(bests.load.maxWeightKg)} ${unit}${bests.load.repsAtMax ? ` por ${bests.load.repsAtMax} repetições` : ""}, ${date(bests.load)}. Abrir treino`,
    },
    ...(bests.oneRm?.best1RMKg != null
      ? [
          {
            label: "Melhor 1RM est.",
            value: load(bests.oneRm.best1RMKg),
            sub: `${bests.oneRm.best1RMSet ? `${load(bests.oneRm.best1RMSet.weightKg)} ${TIMES_SIGN} ${bests.oneRm.best1RMSet.reps} · ` : ""}${date(bests.oneRm)}`,
            session: bests.oneRm,
            aria: `Melhor 1RM estimado: ${load(bests.oneRm.best1RMKg)} ${unit}, ${date(bests.oneRm)}. Abrir treino`,
          },
        ]
      : []),
    {
      label: "Maior volume",
      value: formatNumber(toDisplayWeight(bests.volume.volumeKg, unit) ?? 0, 0),
      sub: `${plural(bests.volume.setCount, "série", "séries")} · ${date(bests.volume)}`,
      session: bests.volume,
      aria: `Maior volume num treino: ${formatNumber(toDisplayWeight(bests.volume.volumeKg, unit) ?? 0, 0)} ${unit}, ${date(bests.volume)}. Abrir treino`,
    },
  ];

  return (
    <section aria-labelledby="evolution-records" className="flex animate-guf-rise flex-col gap-2">
      <h2 id="evolution-records" className="m-0 ml-1 text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">
        Recordes pessoais
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            aria-label={c.aria}
            onClick={() => router.push(summaryPath(c.session.sessionId))}
            className={cn(
              "flex min-h-[104px] cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left text-fg transition-[transform,background-color] duration-150 ease-standard active:scale-[.97] motion-reduce:active:scale-100",
              single ? "border-border bg-surface hover:bg-surface-3" : "border-pr/38 bg-record-surface hover:bg-pr-highlight",
            )}
          >
            <span className={cn("flex items-center gap-1 text-xs leading-4 font-semibold", single ? "text-fg-secondary" : "text-pr-text")}>
              {!single && <Icon icon={Trophy} size={13} />}
              {c.label}
            </span>
            <span className="mt-auto flex items-baseline gap-0.5">
              <span className="font-display text-[26px] leading-7 font-bold tabular-nums">{c.value}</span>
              <span className="text-xs text-fg-muted">{unit}</span>
            </span>
            <span className="text-xs leading-4 text-fg-secondary tabular-nums">{c.sub}</span>
          </button>
        ))}
      </div>
      {single && <span className="px-1 text-xs leading-4 text-fg-muted">Recordes contam a partir do segundo treino com este exercício.</span>}
    </section>
  );
}

function RecentSessions({ sessions, unit }: { sessions: ExerciseSessionEvolution[]; unit: WeightUnit }) {
  const router = useRouter();
  const recent = [...sessions].reverse().slice(0, RECENT_LIMIT);
  return (
    <section aria-labelledby="evolution-recent" className="flex animate-guf-rise flex-col gap-2 [animation-delay:120ms]">
      <h2 id="evolution-recent" className="mt-1 mb-0.5 ml-1 text-lg leading-6 font-semibold tracking-[-0.015em]">
        Últimos treinos
      </h2>
      {recent.map((s) => {
        const date = fromLocalISODate(s.performedOn);
        const [day, month] = formatDayMonth(date).split(" ");
        const best = `${formatNumber(toDisplayWeight(s.maxWeightKg, unit) ?? 0)} ${unit}${s.repsAtMax ? ` ${TIMES_SIGN} ${s.repsAtMax}` : ""}`;
        const volume = `${formatNumber(toDisplayWeight(s.volumeKg, unit) ?? 0, 0)} ${unit}`;
        const record = s.records.load || s.records.oneRm || s.records.volume;
        return (
          <button
            key={s.sessionId}
            type="button"
            onClick={() => router.push(summaryPath(s.sessionId))}
            aria-label={`${formatShortDate(date)}, ${s.sessionName}. Melhor série ${best}, ${plural(s.setCount, "série", "séries")}, ${volume}${record ? ", com recorde" : ""}. Abrir treino`}
            className="flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface py-2.5 pr-3 pl-2.5 text-left text-fg transition-[transform,background-color] duration-150 ease-standard hover:bg-surface-3 active:scale-[.98] motion-reduce:active:scale-100"
          >
            <span className="flex size-11 flex-none flex-col items-center justify-center rounded-md bg-surface-3">
              <span className="font-display text-xl leading-5 font-bold tabular-nums">{day}</span>
              <span className="text-[11px] leading-[13px] text-fg-muted">{month}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] leading-5 font-semibold">{s.sessionName}</span>
              <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">
                {best} · {plural(s.setCount, "série", "séries")} · {volume}
              </span>
            </span>
            {record && <Icon icon={Trophy} size={16} className="text-pr-text" />}
            <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
          </button>
        );
      })}
    </section>
  );
}
