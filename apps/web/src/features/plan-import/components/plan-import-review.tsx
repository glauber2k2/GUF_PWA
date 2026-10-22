"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { LibraryExercise, PlanImportDraft, Project } from "@guf/api";
import { planImportSummary } from "@guf/core";
import { Banner, Button, ConfirmDialog, SavingOverlay } from "@/shared/components/ds";
import { AiMark } from "@/shared/components/ai-mark";
import { EditorFrame } from "@/shared/components/editor-frame";
import { ExercisePicker } from "@/features/exercise-picker";
import { OfflineEditBanner } from "@/features/projects";
import { PlanImportDestinationPicker } from "@/features/plan-import/components/plan-import-destination";
import { PlanImportRoutineCard } from "@/features/plan-import/components/plan-import-routine-card";
import { routineExerciseIds } from "@/features/plan-import/helpers/plan-import-draft";
import { usePlanImportReview } from "@/features/plan-import/hooks/use-plan-import-review";

type PickerTarget = { routineKey: string; exerciseKey: string } | null;

interface PlanImportReviewProps {
  initial: PlanImportDraft;
  projects: readonly Project[];
  /** Sair sem criar (depois de confirmar o descarte). */
  onDiscard: () => void;
}

/** Etapa 2: conferir a ficha convertida, ajustar e criar tudo de uma vez. */
export function PlanImportReview({ initial, projects, onDiscard }: PlanImportReviewProps) {
  const review = usePlanImportReview(initial, projects);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const { draft, dispatch } = review;
  const disabled = !review.canEdit || review.isSaving;
  const pickerRoutine = picker ? draft.routines.find((routine) => routine.key === picker.routineKey) : undefined;

  const replace = ([exercise]: LibraryExercise[]) => {
    if (picker && exercise) dispatch({ type: "replaceExercise", ...picker, exercise });
    setPicker(null);
  };

  return (
    <EditorFrame
      title="Revisar ficha"
      onBack={() => setConfirmDiscard(true)}
      bottomBar={
        <Button size="lg" icon={Check} fullWidth disabled={disabled || review.validationError !== null} loading={review.isSaving} onClick={() => void review.create()}>
          {review.destination.kind === "new" ? "Criar projeto e rotinas" : "Criar rotinas"}
        </Button>
      }
    >
      {!review.canEdit && <OfflineEditBanner />}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <AiMark size={28} className="flex-none text-accent-text" />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm leading-5 font-semibold text-fg">Ficha convertida pelo GUF AI</span>
          <span className="text-[13px] leading-[18px] text-fg-secondary tabular-nums">{planImportSummary(review.counts)}</span>
        </div>
      </div>
      <p className="m-0 text-[13px] leading-[18px] text-pretty text-fg-secondary">
        Toque num exercício para ajustar séries e repetições.
        {review.counts.newExercises > 0 && " Os marcados como Novo não estão no catálogo do guf e serão criados como exercícios seus; toque em trocar para usar outro."}
      </p>

      <PlanImportDestinationPicker
        projects={projects}
        destination={review.destination}
        projectName={draft.projectName}
        disabled={disabled}
        onDestination={review.setDestination}
        onProjectName={(name) => dispatch({ type: "renameProject", name })}
      />

      <h2 className="m-0 pt-2 text-sm leading-5 font-semibold text-fg-secondary">Rotinas</h2>
      {draft.routines.map((routine) => (
        <PlanImportRoutineCard
          key={routine.key}
          routine={routine}
          disabled={disabled}
          canRemove={draft.routines.length > 1}
          onRename={(name) => dispatch({ type: "renameRoutine", routineKey: routine.key, name })}
          onRemove={() => dispatch({ type: "removeRoutine", routineKey: routine.key })}
          onChangeExercise={(exerciseKey, patch) => dispatch({ type: "updateExercise", routineKey: routine.key, exerciseKey, patch })}
          onReplaceExercise={(exerciseKey) => setPicker({ routineKey: routine.key, exerciseKey })}
          onRemoveExercise={(exerciseKey) => dispatch({ type: "removeExercise", routineKey: routine.key, exerciseKey })}
        />
      ))}

      {review.validationError && (
        <Banner tone="warning" className="animate-guf-rise-fast">
          {review.validationError}
        </Banner>
      )}
      {review.saveError && (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void review.create()} className="animate-guf-rise-fast">
          {review.saveError.code === "network_error" ? "Não foi possível criar as rotinas. Verifique a internet e tente de novo." : review.saveError.message}
        </Banner>
      )}

      {picker && pickerRoutine && (
        <ExercisePicker mode="troca" addedExerciseIds={routineExerciseIds(pickerRoutine)} onClose={() => setPicker(null)} onConfirm={replace} />
      )}
      <ConfirmDialog
        open={confirmDiscard}
        placement="screen"
        title="Descartar a ficha?"
        message="Nada foi criado ainda. Para importar de novo, será preciso converter a ficha outra vez."
        cancelLabel="Continuar revisando"
        confirmLabel="Descartar"
        destructive
        onCancel={() => setConfirmDiscard(false)}
        onConfirm={onDiscard}
      />
      <SavingOverlay open={review.isSaving} title="Criando rotinas" message="Leva só um instante." variant={7} />
    </EditorFrame>
  );
}
