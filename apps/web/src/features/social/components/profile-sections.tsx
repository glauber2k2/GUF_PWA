"use client";

import Link from "next/link";
import { useState } from "react";
import { EyeOff, Lock } from "lucide-react";
import {
  formatDayMonth,
  formatElapsed,
  formatNumber,
  fromLocalISODate,
  formatShortDate,
  MEMBER_HISTORY_SCOPE_NOTE,
  plural,
  toDisplayWeight,
  type WeightUnit,
} from "@guf/core";
import type { EvolutionWeek, MemberProfile, MemberWorkout } from "@guf/api";
import { Button, Icon, ProgressChart, SegmentedControl, Skeleton, StreakFlame, WorkoutSummaryCard } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import type { EvolutionPeriod } from "@/features/social/constants/profile-evolution";

/** Seguidores e seguindo levam à lista; Treinos só mostra o número (traço se o perfil está fechado). */
export function ProfileCounts({ profile }: { profile: MemberProfile }) {
  const list = (aba: string) => `/seguidores?aba=${aba}${profile.isSelf ? "" : `&u=${encodeURIComponent(profile.handle)}`}`;
  const stat = (value: string, label: string) => (
    <>
      <span className="font-display text-[26px] leading-7 font-bold tabular-nums">{value}</span>
      <span className="text-xs leading-4 text-fg-secondary">{label}</span>
    </>
  );
  const linkClass = "flex flex-col gap-0.5 rounded-md py-1.5 text-fg no-underline hover:bg-surface";
  return (
    <div className="grid min-w-0 flex-1 grid-cols-3 gap-1 text-center">
      {profile.unlocked ? (
        <Link href={list("seguidores")} className={linkClass}>
          {stat(formatNumber(profile.followersCount, 0), "Seguidores")}
        </Link>
      ) : (
        <div className="flex flex-col gap-0.5 py-1.5">{stat(formatNumber(profile.followersCount, 0), "Seguidores")}</div>
      )}
      {profile.unlocked ? (
        <Link href={list("seguindo")} className={linkClass}>
          {stat(formatNumber(profile.followingCount, 0), "Seguindo")}
        </Link>
      ) : (
        <div className="flex flex-col gap-0.5 py-1.5">{stat(formatNumber(profile.followingCount, 0), "Seguindo")}</div>
      )}
      <div className="flex flex-col gap-0.5 py-1.5">{stat(profile.workoutsCount === null ? "—" : formatNumber(profile.workoutsCount, 0), "Treinos")}</div>
    </div>
  );
}

/** Perfil privado para quem ainda não segue. */
export function LockedProfile({ profile }: { profile: MemberProfile }) {
  const first = profile.name?.split(" ")[0] ?? `@${profile.handle}`;
  const text =
    profile.relationship === "requested"
      ? `Solicitação enviada. Quando ${first} aprovar, você verá a evolução e a sequência.`
      : `Siga @${profile.handle} para ver a evolução e a sequência de treinos.`;
  return (
    <section aria-label="Perfil privado" className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-8 text-center">
      <span className="grid size-14 place-items-center rounded-lg bg-surface-3 text-fg-secondary">
        <Icon icon={Lock} size={26} />
      </span>
      <strong className="text-[17px] leading-6">Este perfil é privado</strong>
      <p className="m-0 max-w-[280px] text-sm leading-5 text-pretty text-fg-secondary">{text}</p>
    </section>
  );
}

/** Sequência de semanas com as 8 últimas (a atual sem treino fica "em andamento"). */
export function ProfileStreak({ profile }: { profile: MemberProfile }) {
  const streak = profile.currentStreak ?? 0;
  const weeks = profile.recentWeeks ?? [];
  return (
    <section aria-label="Sequência" className="flex items-center gap-4 rounded-lg border border-border bg-surface px-5 py-4 shadow-e1">
      <span className="grid size-14 flex-none place-items-center rounded-[14px] bg-accent/14 text-accent-text">
        <StreakFlame size={30} animate={streak > 0 ? "flicker" : "none"} label={`Sequência de ${streak} semanas`} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="flex items-baseline gap-1.5">
            <span className="font-display text-[34px] leading-[34px] font-bold tabular-nums">{streak}</span>
            <span className="text-sm font-semibold whitespace-nowrap">{streak === 1 ? "semana seguida" : "semanas seguidas"}</span>
          </span>
          <span className="text-xs whitespace-nowrap text-fg-muted">Recorde {profile.bestStreak ?? 0}</span>
        </div>
        <div aria-label="Últimas 8 semanas" className="grid grid-cols-8 gap-1">
          {weeks.map((done, i) => {
            const isCurrent = i === weeks.length - 1;
            return (
              <span
                key={i}
                title={isCurrent ? (done ? "Esta semana, garantida" : "Esta semana, em andamento") : done ? "Semana com treino" : "Semana sem treino"}
                className={cn("h-1.5 rounded-pill", done ? "bg-accent" : isCurrent ? "bg-accent/30" : "bg-surface-3")}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

export type EvolutionMetric = "volume" | "carga" | "horas";
const METRIC_OPTIONS = [
  { value: "volume", label: "Volume" },
  { value: "carga", label: "Carga" },
  { value: "horas", label: "Horas" },
];

const METRIC_ARIA: Record<EvolutionMetric, string> = {
  volume: "Volume semanal",
  carga: "Carga máxima semanal",
  horas: "Horas treinadas por semana",
};

function evolutionValue(week: EvolutionWeek, metric: EvolutionMetric, unit: WeightUnit): number {
  if (metric === "horas") return Math.round((week.activeSeconds / 3600) * 10) / 10;
  if (metric === "carga") return toDisplayWeight(week.maxWeightKg, unit) ?? 0;
  return Math.round(toDisplayWeight(week.volumeKg, unit) ?? 0);
}

/** Evolução semanal (volume, carga máxima ou horas) nos períodos oferecidos (`periods`). */
export function ProfileEvolution({
  weeks,
  loading,
  periods,
  period,
  onPeriod,
  unit,
}: {
  weeks: EvolutionWeek[] | undefined;
  loading: boolean;
  periods: readonly EvolutionPeriod[];
  period: EvolutionPeriod;
  onPeriod: (period: EvolutionPeriod) => void;
  unit: WeightUnit;
}) {
  const [metric, setMetric] = useState<EvolutionMetric>("volume");
  const values = (weeks ?? []).map((w) => evolutionValue(w, metric, unit));
  const first = weeks?.[0];
  return (
    <section aria-label="Evolução" className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-5 shadow-e1">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-lg leading-6 font-bold tracking-[-0.01em]">Evolução</h2>
        <SegmentedControl options={[...periods]} value={period} onChange={(v) => onPeriod(v as EvolutionPeriod)} variant="solid" size="sm" label="Período" />
      </div>
      <SegmentedControl options={METRIC_OPTIONS} value={metric} onChange={(v) => setMetric(v as EvolutionMetric)} shape="rounded" label="Métrica" />
      {loading || !weeks ? (
        <Skeleton className="h-[220px] w-full rounded-md" />
      ) : (
        <ProgressChart
          values={values}
          startLabel={first ? formatShortDate(fromLocalISODate(first.weekStart)).split(", ")[1] : ""}
          endLabel="hoje"
          unit={metric === "horas" ? "h" : unit}
          ariaLabel={METRIC_ARIA[metric]}
          pointLabels={(weeks ?? []).map((w) => `Semana de ${formatDayMonth(fromLocalISODate(w.weekStart))}`)}
          pointDetails={(weeks ?? []).map((w) => plural(w.sessions, "treino", "treinos"))}
        />
      )}
    </section>
  );
}

/** Histórico de treinos: cartões; oculto para visitantes quando a pessoa escondeu. De outra pessoa, só o mês atual. */
export function ProfileHistory({
  profile,
  workouts,
  loading,
  hasMore,
  loadingMore,
  onMore,
  onOpenWorkout,
  unit,
}: {
  profile: MemberProfile;
  workouts: MemberWorkout[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onMore: () => void;
  onOpenWorkout?: (sessionId: string) => void;
  unit: WeightUnit;
}) {
  const first = profile.name?.split(" ")[0] ?? `@${profile.handle}`;
  return (
    <section aria-label="Histórico de treinos" className="flex flex-col gap-3">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 className="m-0 text-lg leading-6 font-bold tracking-[-0.01em]">Histórico de treinos</h2>
        {profile.isSelf && profile.historyHidden && (
          <Link
            href="/configuracoes/privacidade"
            className="flex h-7 items-center gap-1.5 rounded-pill bg-surface-3 px-2.5 text-xs font-semibold text-fg-secondary no-underline"
          >
            <Icon icon={EyeOff} size={14} />
            Só você vê
          </Link>
        )}
      </div>
      {!profile.isSelf && profile.historyVisible && <p className="-mt-2 mb-0 text-[13px] leading-[18px] text-fg-secondary">{MEMBER_HISTORY_SCOPE_NOTE}</p>}

      {!profile.historyVisible ? (
        <div className="flex items-center gap-3.5 rounded-lg border border-dashed border-border-strong px-5 py-[18px]">
          <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
            <Icon icon={EyeOff} size={20} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <strong className="text-[15px] leading-5">Histórico privado</strong>
            <span className="text-[13px] leading-[18px] text-pretty text-fg-secondary">
              {first} mostra a evolução e a sequência, mas mantém os treinos só para si.
            </span>
          </div>
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-[132px] w-full rounded-lg" />
          <Skeleton className="h-[132px] w-full rounded-lg" />
        </div>
      ) : workouts.length === 0 ? (
        <p className="m-0 text-sm text-fg-secondary">{profile.isSelf ? "Nenhum treino concluído ainda." : "Nenhum treino concluído neste mês."}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {workouts.map((w) => (
            <WorkoutSummaryCard
              key={w.sessionId}
              title={w.name ?? "Treino livre"}
              date={formatShortDate(fromLocalISODate(w.performedOn))}
              stats={[
                { value: formatElapsed(w.durationSeconds), label: "Duração" },
                { value: formatNumber(toDisplayWeight(w.volumeKg, unit) ?? 0, 0), label: `Volume ${unit}` },
                { value: String(w.sets), label: "Séries" },
              ]}
              prs={w.records}
              onClick={onOpenWorkout ? () => onOpenWorkout(w.sessionId) : undefined}
            />
          ))}
          {hasMore && (
            <Button variant="ghost" loading={loadingMore} onClick={onMore} className="self-center">
              Ver mais treinos
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
