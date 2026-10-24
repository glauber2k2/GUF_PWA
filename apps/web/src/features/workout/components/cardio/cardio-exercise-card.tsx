"use client";

import { useState } from "react";
import { History, Pencil, Timer } from "lucide-react";
import { cardioActivityFor, cardioSetCountLabel, cardioTotals } from "@guf/core";
import { Icon, SegmentedControl, Tag } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { CardioCollapsedSummary } from "@/features/workout/components/cardio/cardio-collapsed-summary";
import { CardioManualForm } from "@/features/workout/components/cardio/cardio-manual-form";
import { CardioSetTable, type CardioLoggedSet } from "@/features/workout/components/cardio/cardio-set-table";
import { CardioTimerPanel } from "@/features/workout/components/cardio/cardio-timer-panel";
import { ExerciseCardShell, type ExerciseCardFrameProps } from "@/features/workout/components/exercise-card-shell";
import { CARDIO_ACTIVITY_ICONS } from "@/features/workout/constants/cardio-activity-icons";
import type { ExerciseView } from "@/features/workout/helpers/workout-state";
import type { CardioTimerControls } from "@/features/workout/hooks/use-cardio-timer-controls";
import type { CardioSetEntry } from "@/features/workout/hooks/use-workout-editing";

type CardioMode = "timer" | "manual";

const MODE_OPTIONS = [
  { value: "timer", label: "Cronômetro", icon: Timer },
  { value: "manual", label: "Manual", icon: Pencil },
];

export interface CardioExerciseCardProps extends ExerciseCardFrameProps {
  exercise: ExerciseView;
  /** Cronômetro do treino em andamento; sem ele (treino concluído), só o registro manual. */
  timer?: CardioTimerControls;
  /** Registra uma série (tempo e km opcional); devolve o id dela. */
  onLogSet: (entry: CardioSetEntry) => string | null;
  onSaveDistance: (setId: string, distanceKm: number | null) => void;
  onRemoveSet: (index: number) => void;
}

/** Séries já registradas (concluídas); as planejadas em aberto não aparecem: o cardio registra o que foi feito. */
function loggedSets(exercise: ExerciseView): CardioLoggedSet[] {
  return exercise.sets.flatMap((set, index) => (set.isCompleted ? [{ set, index }] : []));
}

/**
 * Card de um exercício de cardio no treino (protótipo "Treino Cardio"): cronômetro (iniciar, pausar e
 * parar vira uma série) ou tempo e km digitados; tabela com ritmo ou velocidade conforme o aparelho;
 * recolhido, o total e os controles do cronômetro.
 */
export function CardioExerciseCard({ exercise: e, timer, onLogSet, onSaveDistance, onRemoveSet, ...frame }: CardioExerciseCardProps) {
  const [mode, setMode] = useState<CardioMode>(timer ? "timer" : "manual");
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const activity = cardioActivityFor(e.name);
  const sets = loggedSets(e);
  const totals = cardioTotals(
    sets.map(({ set }) => set),
    activity.rate,
  );
  const isTimerActive = timer !== undefined && timer.phase !== "idle";
  // Parar o cronômetro com o card aberto já abre o campo de km da série nova (opcional).
  const timerWithDistancePrompt: CardioTimerControls | undefined = timer && {
    ...timer,
    stop: () => {
      const setId = timer.stop();
      if (setId && e.open) setEditingSetId(setId);
      return setId;
    },
  };

  return (
    <ExerciseCardShell
      {...frame}
      name={e.name}
      open={e.open}
      flash={e.flash}
      note={e.note}
      icon={CARDIO_ACTIVITY_ICONS[activity.key]}
      isLive={timer?.phase === "running"}
      meta={(compact) => (
        <>
          <Tag size="sm">Cardio</Tag>
          <Tag size="sm" tone="muted" className={cn(compact && "hidden")}>
            {activity.tag}
          </Tag>
          {sets.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium whitespace-nowrap text-fg-muted">
              <Icon icon={History} size={13} />
              {cardioSetCountLabel(sets.length)}
            </span>
          )}
        </>
      )}
      collapsedContent={<CardioCollapsedSummary timer={timerWithDistancePrompt} setCount={sets.length} totals={totals} />}
    >
      {timerWithDistancePrompt && (
        <div className="px-4 pb-3.5">
          <SegmentedControl
            label="Como registrar"
            options={MODE_OPTIONS}
            value={mode}
            // Com o cronômetro contando, o modo fica no cronômetro (o tempo não pode se perder).
            onChange={(value) => !isTimerActive && setMode(value as CardioMode)}
          />
        </div>
      )}
      {timerWithDistancePrompt && mode === "timer" ? (
        <CardioTimerPanel
          timer={timerWithDistancePrompt}
          nextSetNumber={sets.length + 1}
          loggedSeconds={sets.reduce((sum, { set }) => sum + (set.durationSeconds ?? 0), 0)}
          lastSeconds={sets.at(-1)?.set.durationSeconds ?? null}
        />
      ) : (
        <CardioManualForm onAdd={onLogSet} />
      )}
      {sets.length > 0 && (
        <CardioSetTable
          sets={sets}
          rate={activity.rate}
          editingSetId={editingSetId}
          onEditDistance={setEditingSetId}
          onSaveDistance={onSaveDistance}
          onRemove={onRemoveSet}
        />
      )}
    </ExerciseCardShell>
  );
}
