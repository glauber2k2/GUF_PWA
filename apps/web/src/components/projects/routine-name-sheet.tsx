"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import { ROUTINE_NAME_MAX_LENGTH, routineNameSchema, type RoutineNameValues } from "@guf/schemas";
import type { Project, ProjectRoutine } from "@guf/api";
import { useAppShell } from "@/components/app-shell/app-shell";
import { BottomSheet, Button, TextField } from "@/components/ds";
import { useProjectsSource } from "@/hooks/use-projects";
import { invalidatePlanningData } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { SaveErrorBanner, useSaveState } from "./save-state";

export interface RoutineNameSheetProps {
  open: boolean;
  project: Project | null;
  /** Rotina a renomear; ausente = nova rotina (no fim da lista). */
  routine?: ProjectRoutine;
  onClose: () => void;
}

/** Nova rotina / renomear rotina (só o nome; os exercícios são montados na tela da rotina). */
export function RoutineNameSheet({ open, project, routine, onClose }: RoutineNameSheetProps) {
  const { api } = useProjectsSource();
  const queryClient = useQueryClient();
  const shell = useAppShell();
  const save = useSaveState();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<RoutineNameValues>({ resolver: zodResolver(routineNameSchema), mode: "onChange", defaultValues: { name: "" } });

  const resetSave = save.reset;
  useEffect(() => {
    if (!open) return;
    reset({ name: routine?.name ?? "" });
    resetSave();
  }, [open, routine, reset, resetSave]);

  const nameLength = useWatch({ control, name: "name" }).trim().length;

  const onSubmit = handleSubmit(async ({ name }) => {
    if (!project || !save.ensureOnline()) return;
    setSubmitting(true);
    const client = getSupabaseClient();
    const result = routine
      ? await api.renameRoutine(client, { routineId: routine.id, name })
      : await api.createRoutine(client, { projectId: project.id, name });
    setSubmitting(false);
    if (result.error) return save.fail(result.error);
    await invalidatePlanningData(queryClient);
    shell.showToast(routine ? "Rotina renomeada" : "Rotina criada", { icon: CircleCheck });
    onClose();
  });

  return (
    <BottomSheet
      placement="screen"
      open={open}
      onClose={onClose}
      title={routine ? "Renomear rotina" : "Nova rotina"}
      subtitle={project?.name}
    >
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <SaveErrorBanner state={save} onRetry={() => void onSubmit()} />
        <TextField
          label="Nome da rotina"
          placeholder="Ex.: Treino A – Peito e Tríceps"
          autoComplete="off"
          hint={`Obrigatório · ${nameLength}/${ROUTINE_NAME_MAX_LENGTH}`}
          error={errors.name?.message}
          {...register("name")}
        />
        <Button type="submit" size="lg" fullWidth disabled={!isValid || submitting} loading={submitting}>
          Salvar
        </Button>
      </form>
    </BottomSheet>
  );
}
