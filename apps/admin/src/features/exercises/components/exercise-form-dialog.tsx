"use client";

import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { EquipmentCode, MuscleGroupCode } from "@guf/core";
import type { ApiError } from "@guf/api";
import { catalogExerciseSchema, type CatalogExerciseInput } from "@guf/schemas";
import { Banner, Button, TextField } from "@guf/ui";
import { EquipmentSelect, MuscleGroupSelect } from "@/features/exercises/components/exercise-fields";
import { Dialog, DialogActions } from "@/shared/components/dialog";

export interface ExerciseFormValues {
  name: string;
  muscleGroup: MuscleGroupCode | null;
  equipment: EquipmentCode;
}

interface ExerciseFormDialogProps {
  title: string;
  subtitle: string;
  initial: ExerciseFormValues;
  submitLabel: string;
  submitIcon: LucideIcon;
  isSubmitting: boolean;
  error: ApiError | null;
  /** Aviso extra entre os campos e os botões (ex.: regra do cardio num exercício já usado). */
  notice?: (values: ExerciseFormValues) => ReactNode;
  onSubmit: (exercise: CatalogExerciseInput) => void;
  onClose: () => void;
}

/**
 * Formulário de um exercício do catálogo (nome, grupo, equipamento) num diálogo. Só valida e devolve
 * os valores: quem abre decide o que gravar (cadastrar ou editar).
 */
export function ExerciseFormDialog({ title, subtitle, initial, submitLabel, submitIcon, isSubmitting, error, notice, onSubmit, onClose }: ExerciseFormDialogProps) {
  const [values, setValues] = useState(initial);
  const [tried, setTried] = useState(false);
  const parsed = catalogExerciseSchema.safeParse(values);
  const fieldError = (field: keyof ExerciseFormValues) => (tried && !parsed.success ? parsed.error.issues.find((i) => i.path[0] === field)?.message : undefined);
  const change = (patch: Partial<ExerciseFormValues>) => setValues((current) => ({ ...current, ...patch }));

  const submit = () => {
    setTried(true);
    if (parsed.success) onSubmit(parsed.data);
  };

  return (
    <Dialog open title={title} subtitle={subtitle} onClose={onClose} showClose>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <TextField label="Nome" value={values.name} onChange={(e) => change({ name: e.target.value })} error={fieldError("name")} hint="Ex.: Supino inclinado com halteres" />
        <MuscleGroupSelect label="Grupo muscular" value={values.muscleGroup} onChange={(muscleGroup) => change({ muscleGroup })} error={fieldError("muscleGroup")} />
        <EquipmentSelect label="Equipamento" value={values.equipment} onChange={(equipment) => change({ equipment })} error={fieldError("equipment")} />
        {notice?.(values)}
        {error && <Banner tone="danger">{error.message}</Banner>}
        <DialogActions>
          <Button type="button" variant="secondary" size="tall" fullWidth onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" size="tall" icon={submitIcon} fullWidth loading={isSubmitting}>
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
