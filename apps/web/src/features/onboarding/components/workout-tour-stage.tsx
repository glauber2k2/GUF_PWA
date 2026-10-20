"use client";

import { Flag } from "lucide-react";
import { setsProgressLabel } from "@guf/core";
import { Button } from "@/shared/components/ds";
import { AddExerciseButton, WorkoutExerciseCard, WorkoutHeader } from "@/features/workout";
import { TOUR_TARGETS } from "@/features/onboarding/constants/tour-targets";
import { WORKOUT_DEMO_ELAPSED, WORKOUT_DEMO_EXERCISES, WORKOUT_DEMO_NAME } from "@/features/onboarding/constants/workout-demo";

const noop = () => undefined;

const ALL_SETS = WORKOUT_DEMO_EXERCISES.flatMap((exercise) => exercise.sets);
const DONE_SETS = ALL_SETS.filter((set) => set.isCompleted).length;

/**
 * Demonstração da tela de treino dentro do tour, com os componentes reais (cabeçalho, card do
 * exercício, adicionar exercício, finalizar) e dados de exemplo. É só imagem: `inert` (sem toque nem
 * foco) e nada é gravado, porque a tela de treino de verdade só abre com um treino em andamento.
 */
export function WorkoutTourStage() {
  return (
    <div data-tour={TOUR_TARGETS.workoutStage} inert className="absolute inset-0 overflow-y-auto bg-background">
      <div className="mx-auto flex min-h-full max-w-[430px] flex-col gap-3 px-4 pb-[calc(124px+env(safe-area-inset-bottom))]">
        <div data-tour={TOUR_TARGETS.workoutHeader}>
          <WorkoutHeader
            name={WORKOUT_DEMO_NAME}
            elapsedText={WORKOUT_DEMO_ELAPSED}
            paused={false}
            progressText={setsProgressLabel(DONE_SETS, ALL_SETS.length)}
            progressPct={(DONE_SETS / ALL_SETS.length) * 100}
            onMinimize={noop}
            onTogglePause={noop}
            onOpenMenu={noop}
          />
        </div>
        {WORKOUT_DEMO_EXERCISES.map((exercise, index) => (
          <WorkoutExerciseCard
            key={exercise.id}
            exercise={exercise}
            unit="kg"
            enterDelayMs={index * 40}
            poppedKey={null}
            editing={null}
            onToggleOpen={noop}
            onOpenMenu={noop}
            onOpenNote={noop}
            onAddSet={noop}
            onToggleSet={noop}
            onCycleType={noop}
            onEditField={noop}
            onRemoveSet={noop}
          />
        ))}
        <AddExerciseButton data-tour={TOUR_TARGETS.workoutAddExercise} />
      </div>
      <footer className="fixed inset-x-0 bottom-0 border-t border-border bg-background/92 backdrop-blur-[12px]">
        <div className="mx-auto max-w-[430px] px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
          <Button data-tour={TOUR_TARGETS.workoutFinish} size="lg" icon={Flag} fullWidth>
            Finalizar treino
          </Button>
        </div>
      </footer>
    </div>
  );
}
