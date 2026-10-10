"use client";

import {
  ArrowLeftRight,
  Calendar,
  Check,
  ChevronRight,
  Dumbbell,
  List,
  Play,
  Plus,
  RotateCcw,
  Timer,
  type LucideIcon,
} from "lucide-react";
import {
  estimateRoutineMinutes,
  formatClock,
  formatNumber,
  formatPlannedSets,
  plannedSetCount,
  plural,
  routineMuscleGroups,
  startedAgoLabel,
} from "@guf/core";
import type { FinishedSession, InProgressSession, RoutineSummary } from "@guf/api";
import { Button, Icon, StatGrid, Tag } from "@/components/ds";
import { cn } from "@/lib/utils";

const CARD = "flex flex-col rounded-lg border border-border bg-surface p-5 shadow-e1";
const OVERLINE = "text-[11px] leading-4 font-semibold tracking-[0.08em] uppercase";
const PREVIEW_COUNT = 3;

export type TodayCardState =
  | { kind: "in_progress"; session: InProgressSession }
  | { kind: "planned"; projectName: string; routine: RoutineSummary }
  | { kind: "empty" }
  | { kind: "new" }
  | { kind: "done"; sessions: FinishedSession[] };

export interface TodayCardActions {
  onResume: (sessionId: string) => void;
  onStartPlanned: (routine: RoutineSummary) => void;
  onSwapRoutine: () => void;
  onStartEmpty: () => void;
  onChooseRoutine: () => void;
  onCreateRoutine: () => void;
  onOpenSummary: () => void;
}

/** Soma os números dos treinos concluídos (vários no mesmo dia viram um resumo só). */
export function sessionStats(sessions: FinishedSession[]) {
  const duration = sessions.reduce((t, s) => t + s.durationSeconds, 0);
  const volume = sessions.reduce((t, s) => t + s.volumeKg, 0);
  const sets = sessions.reduce((t, s) => t + s.setCount, 0);
  return [
    { label: "Duração", value: formatClock(duration) },
    { label: "Volume", value: formatNumber(volume, 0), unit: " kg" },
    { label: "Séries", value: formatNumber(sets, 0) },
  ];
}

function NoPlanCard({ icon, message, actions, isNew }: { icon: LucideIcon; message: string; actions: TodayCardActions; isNew: boolean }) {
  return (
    <section aria-label="Treino de hoje" className={CARD}>
      <span className={cn(OVERLINE, "text-fg-muted")}>Treino de hoje</span>
      <div className="mt-3 flex items-center gap-3.5">
        <span className="grid size-12 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
          <Icon icon={icon} size={24} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-lg leading-6 font-semibold text-pretty">Nenhum treino planejado para hoje</h2>
          <span className="text-sm leading-5 text-pretty text-fg-secondary">{message}</span>
        </div>
      </div>
      <Button size="lg" icon={Plus} fullWidth sheen className="mt-5" onClick={actions.onStartEmpty}>
        Iniciar treino vazio
      </Button>
      <Button variant="ghost" icon={List} fullWidth className="mt-1" onClick={actions.onChooseRoutine}>
        Escolher uma rotina
      </Button>
      {isNew && (
        <button
          type="button"
          onClick={actions.onCreateRoutine}
          className={cn(
            "mt-2 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border-strong",
            "bg-transparent text-sm font-medium text-fg-secondary hover:bg-surface-3",
            "transition-[transform,background-color] duration-150 active:scale-[.97] motion-reduce:active:scale-100",
          )}
        >
          <Icon icon={Plus} size={16} />
          Criar minha primeira rotina
        </button>
      )}
    </section>
  );
}

/** Card "Treino de hoje": planejado · sem plano · usuário novo · concluído. */
export function TodayCard({ state, actions }: { state: TodayCardState; actions: TodayCardActions }) {
  if (state.kind === "empty") {
    return <NoPlanCard icon={Calendar} message="Monte um treino na hora ou escolha uma das suas rotinas." actions={actions} isNew={false} />;
  }
  if (state.kind === "new") {
    return <NoPlanCard icon={Dumbbell} message="Comece agora e monte os exercícios conforme treina." actions={actions} isNew />;
  }

  if (state.kind === "in_progress") {
    const { session } = state;
    return (
      <section aria-label="Treino em andamento" className={cn(CARD, "border-[1.5px] border-accent-text")}>
        <span className={cn(OVERLINE, "text-accent-text")}>Treino em andamento</span>
        <div className="mt-3 flex items-center gap-3.5">
          <span className="grid size-12 flex-none place-items-center rounded-md bg-accent/16 text-accent-text">
            <Icon icon={Timer} size={24} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="m-0 truncate text-lg leading-6 font-semibold">{session.name}</h2>
            <span className="text-sm leading-5 text-fg-secondary">{startedAgoLabel(session.startedAt)}</span>
          </div>
        </div>
        <Button size="lg" icon={Play} fullWidth sheen className="mt-5" onClick={() => actions.onResume(session.id)}>
          Retomar treino
        </Button>
      </section>
    );
  }

  if (state.kind === "done") {
    const last = state.sessions[state.sessions.length - 1];
    const subtitle = state.sessions.length > 1 ? `${last?.name} e mais ${state.sessions.length - 1}` : last?.name;
    return (
      <section aria-label="Treino de hoje concluído" className={cn(CARD, "border-[1.5px] border-accent-text bg-done-surface")}>
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 flex-none animate-guf-pop-in place-items-center rounded-md bg-accent text-accent-foreground [animation-delay:380ms]">
            <Icon icon={Check} size={26} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="m-0 text-xl leading-[26px] font-semibold tracking-[-0.015em]">Treino de hoje concluído</h2>
            <span className="truncate text-sm leading-5 text-fg-secondary">{subtitle}</span>
          </div>
        </div>
        <StatGrid stats={sessionStats(state.sessions)} className="mt-5" />
        <Button variant="secondary" size="tall" iconRight={ChevronRight} fullWidth className="mt-5" onClick={actions.onOpenSummary}>
          Ver resumo
        </Button>
        <Button variant="ghost" icon={RotateCcw} fullWidth className="mt-1" onClick={actions.onChooseRoutine}>
          Treinar de novo
        </Button>
      </section>
    );
  }

  const { routine, projectName } = state;
  const minutes = estimateRoutineMinutes(routine.exercises);
  const meta = [
    plural(routine.exercises.length, "exercício", "exercícios"),
    routine.exercises.length > 0 ? plural(plannedSetCount(routine.exercises), "série", "séries") : null,
    minutes ? `~${minutes} min` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const muscleGroups = routineMuscleGroups(routine.exercises.map((e) => e.muscleGroup).filter(Boolean));
  const preview = routine.exercises.slice(0, PREVIEW_COUNT);
  const remaining = routine.exercises.length - preview.length;

  return (
    <section aria-label="Treino de hoje" className={CARD}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn(OVERLINE, "text-accent-text")}>Treino de hoje</span>
        <span className="truncate text-xs leading-4 font-medium text-fg-muted">{projectName}</span>
      </div>
      <h2 className="mt-2 mb-0 text-[22px] leading-7 font-semibold tracking-[-0.015em] text-pretty">{routine.name}</h2>
      <span className="mt-1 text-sm leading-5 text-fg-secondary">{meta}</span>
      {muscleGroups.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {muscleGroups.map((g) => (
            <Tag key={g} size="sm">
              {g}
            </Tag>
          ))}
        </div>
      )}
      <ol className="m-0 mt-4 flex list-none flex-col border-t border-border p-0 pt-2">
        {preview.map((ex, i) => (
          <li key={`${ex.name}-${i}`} className="flex h-11 items-center gap-3">
            <span className="grid size-7 flex-none place-items-center rounded-sm bg-surface-3 font-display text-[15px] font-semibold text-fg-secondary tabular-nums">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-[15px] leading-5 font-medium">{ex.name}</span>
            <span className="font-display text-[17px] font-semibold text-fg-secondary tabular-nums">
              {formatPlannedSets(ex.targetSets, ex.targetReps)}
            </span>
          </li>
        ))}
      </ol>
      {remaining > 0 && (
        <span className="pl-10 text-[13px] leading-5 text-fg-muted">
          +{plural(remaining, "exercício", "exercícios")}
        </span>
      )}
      <Button size="lg" icon={Play} fullWidth sheen className="mt-4" onClick={() => actions.onStartPlanned(routine)}>
        Iniciar treino
      </Button>
      <Button variant="ghost" icon={ArrowLeftRight} fullWidth className="mt-1" onClick={actions.onSwapRoutine}>
        Trocar rotina
      </Button>
    </section>
  );
}
