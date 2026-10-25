"use client";

import { Archive, Trash2 } from "lucide-react";
import type { CatalogExercise } from "@guf/api/admin";
import { Banner, Button, Skeleton } from "@guf/ui";
import { useCatalogExerciseUsage, useDeleteCatalogExercise } from "@/features/exercises/api/use-exercise-catalog";
import { exerciseUsageLabel, isExerciseInUse } from "@/features/exercises/helpers/exercise-usage";
import { Dialog, DialogActions } from "@/shared/components/dialog";

interface DeleteExerciseDialogProps {
  exercise: CatalogExercise;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * Excluir um exercício do catálogo. Nunca usado: apaga. Já usado em rotina ou treino: arquiva (sai do
 * catálogo e do seletor do app; o histórico e as rotinas de quem usa continuam). O banco decide.
 */
export function DeleteExerciseDialog({ exercise, onClose, onDone }: DeleteExerciseDialogProps) {
  const usage = useCatalogExerciseUsage(exercise.id);
  const remove = useDeleteCatalogExercise();
  const inUse = usage.data ? isExerciseInUse(usage.data) : false;

  const confirm = () =>
    remove.mutate(exercise.id, {
      onSuccess: (result) => {
        onDone(result === "archived" ? `"${exercise.name}" arquivado` : `"${exercise.name}" excluído`);
        onClose();
      },
    });

  return (
    <Dialog open title={inUse ? "Arquivar exercício?" : "Excluir exercício?"} subtitle={exercise.name} onClose={() => !remove.isPending && onClose()}>
      {usage.isPending ? (
        <Skeleton className="h-16 rounded-md" />
      ) : usage.isError ? (
        <Banner tone="danger" actionLabel="Tentar de novo" onAction={() => void usage.refetch()}>
          {usage.error.message}
        </Banner>
      ) : inUse && usage.data ? (
        <Banner tone="warning" title={`Em uso: ${exerciseUsageLabel(usage.data)}`}>
          Ele sai do catálogo e do seletor do app, mas continua nas rotinas e no histórico de quem já usou. Não dá para desfazer pelo painel.
        </Banner>
      ) : (
        <span className="text-fg-secondary">Ninguém usou este exercício ainda: ele será apagado de vez. Não dá para desfazer.</span>
      )}
      {remove.error && <Banner tone="danger">{remove.error.message}</Banner>}
      <DialogActions>
        <Button variant="secondary" size="tall" fullWidth disabled={remove.isPending} onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" size="tall" icon={inUse ? Archive : Trash2} fullWidth loading={remove.isPending} disabled={!usage.data} onClick={confirm}>
          {inUse ? "Arquivar" : "Excluir"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
