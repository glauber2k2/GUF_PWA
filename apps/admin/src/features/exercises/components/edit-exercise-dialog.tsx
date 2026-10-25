"use client";

import { Check } from "lucide-react";
import type { CatalogExercise } from "@guf/api/admin";
import { changesSetMetric } from "@guf/core";
import { Banner } from "@guf/ui";
import { useCatalogExerciseUsage, useUpdateCatalogExercise } from "@/features/exercises/api/use-exercise-catalog";
import { ExerciseFormDialog, type ExerciseFormValues } from "@/features/exercises/components/exercise-form-dialog";
import { exerciseUsageLabel, isExerciseInUse } from "@/features/exercises/helpers/exercise-usage";

interface EditExerciseDialogProps {
  exercise: CatalogExercise;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Editar um exercício do catálogo. A mudança vale para quem já usa (rotinas e histórico mostram o nome novo). */
export function EditExerciseDialog({ exercise, onClose, onDone }: EditExerciseDialogProps) {
  const update = useUpdateCatalogExercise();
  const usage = useCatalogExerciseUsage(exercise.id);
  const inUse = usage.data ? isExerciseInUse(usage.data) : false;

  const notice = (values: ExerciseFormValues) => {
    if (!usage.data || !inUse) return null;
    const blocked = values.muscleGroup !== null && changesSetMetric(exercise.muscleGroup, values.muscleGroup);
    return (
      <Banner tone={blocked ? "warning" : "info"} title={`Em uso: ${exerciseUsageLabel(usage.data)}`}>
        {blocked
          ? "Não dá para trocar entre cardio e força num exercício já usado: as séries guardam medidas diferentes. Cadastre um exercício novo."
          : "A mudança aparece para todas as pessoas que já usam este exercício."}
      </Banner>
    );
  };

  return (
    <ExerciseFormDialog
      title="Editar exercício"
      subtitle={exercise.name}
      initial={{ name: exercise.name, muscleGroup: exercise.muscleGroup, equipment: exercise.equipment }}
      submitLabel="Salvar"
      submitIcon={Check}
      isSubmitting={update.isPending}
      error={update.error}
      notice={notice}
      onClose={onClose}
      onSubmit={(values) =>
        update.mutate(
          { id: exercise.id, exercise: values },
          {
            onSuccess: () => {
              onDone(`"${values.name}" atualizado`);
              onClose();
            },
          },
        )
      }
    />
  );
}
