"use client";

import { Plus } from "lucide-react";
import { apiError } from "@guf/api";
import { useCreateCatalogExercises } from "@/features/exercises/api/use-exercise-catalog";
import { ExerciseFormDialog } from "@/features/exercises/components/exercise-form-dialog";

interface NewExerciseDialogProps {
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Cadastro manual de um exercício no catálogo (aparece para todas as contas no app). */
export function NewExerciseDialog({ onClose, onDone }: NewExerciseDialogProps) {
  const create = useCreateCatalogExercises();
  // Nome que já existe não é erro do servidor (ele só pula): vira o mesmo aviso da edição.
  const isDuplicate = create.data?.created.length === 0;
  return (
    <ExerciseFormDialog
      title="Novo exercício"
      subtitle="Entra no catálogo do guf e aparece para todas as pessoas no app."
      initial={{ name: "", muscleGroup: null, equipment: "outro" }}
      submitLabel="Cadastrar"
      submitIcon={Plus}
      isSubmitting={create.isPending}
      error={create.error ?? (isDuplicate ? apiError("catalog_exercise_duplicate") : null)}
      onClose={onClose}
      onSubmit={(exercise) =>
        create.mutate(
          { exercises: [exercise], source: "manual" },
          {
            onSuccess: ({ created }) => {
              if (created.length === 0) return;
              onDone(`"${exercise.name}" cadastrado no catálogo`);
              onClose();
            },
          },
        )
      }
    />
  );
}
