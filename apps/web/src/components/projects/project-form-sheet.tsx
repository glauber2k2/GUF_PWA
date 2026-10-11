"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { PROJECT_DESCRIPTION_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH, projectFormSchema, type ProjectFormValues } from "@guf/schemas";
import type { Project } from "@guf/api";
import { useAppShell } from "@/components/app-shell/app-shell";
import { BottomSheet, Button, Switch, TextAreaField, TextField } from "@/components/ds";
import { useProjectsSource } from "@/hooks/use-projects";
import { invalidatePlanningData } from "@/lib/query-keys";
import { getSupabaseClient } from "@/lib/supabase";
import { SaveErrorBanner, useSaveState } from "./save-state";

export interface ProjectFormSheetProps {
  open: boolean;
  /** Projeto em edição; ausente = criar. */
  project?: Project;
  /** Ativo atual (texto do switch "Ativar este projeto"). */
  activeProject: Project | null;
  onClose: () => void;
  /** Depois de salvar (criação: id do projeto novo). */
  onSaved: (projectId: string, created: boolean) => void;
}

/** Criar/editar projeto: nome (obrigatório), descrição (opcional) e, na criação, ativar. */
export function ProjectFormSheet({ open, project, activeProject, onClose, onSaved }: ProjectFormSheetProps) {
  const { api } = useProjectsSource();
  const queryClient = useQueryClient();
  const shell = useAppShell();
  const save = useSaveState();
  const creating = !project;
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isValid },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    mode: "onChange",
    defaultValues: { name: "", description: "", activate: false },
  });

  // Cada abertura começa do projeto em edição (ou vazio, ativando quando não há projeto ativo).
  const resetSave = save.reset;
  useEffect(() => {
    if (!open) return;
    reset({ name: project?.name ?? "", description: project?.description ?? "", activate: !project && !activeProject });
    resetSave();
  }, [open, project, activeProject, reset, resetSave]);

  const nameLength = useWatch({ control, name: "name" }).trim().length;
  const descriptionLength = useWatch({ control, name: "description" }).length;
  const activate = useWatch({ control, name: "activate" });

  const onSubmit = handleSubmit(async (values) => {
    if (!save.ensureOnline()) return;
    setSubmitting(true);
    const client = getSupabaseClient();
    const result = project
      ? await api.updateProject(client, { id: project.id, ...values }).then((r) => (r.error ? r : { data: { id: project.id }, error: null }))
      : await api.createProject(client, values);
    setSubmitting(false);
    if (result.error) return save.fail(result.error);
    await invalidatePlanningData(queryClient);
    shell.showToast(creating ? (values.activate ? "Projeto criado e ativado" : "Projeto criado") : "Projeto salvo", { tone: "success" });
    onSaved(result.data.id, creating);
  });

  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title={creating ? "Novo projeto" : "Editar projeto"}>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        <SaveErrorBanner state={save} onRetry={() => void onSubmit()} />
        <TextField
          label="Nome"
          placeholder="Ex.: Hipertrofia 2026 – ABC"
          autoComplete="off"
          hint={`Obrigatório · ${nameLength}/${PROJECT_NAME_MAX_LENGTH}`}
          error={errors.name?.message}
          {...register("name")}
        />
        <TextAreaField
          label="Descrição (opcional)"
          placeholder="Ex.: Foco em volume, 3 vezes por semana."
          hint={`${descriptionLength}/${PROJECT_DESCRIPTION_MAX_LENGTH}`}
          error={errors.description?.message}
          {...register("description")}
        />
        {creating && (
          <div className="flex flex-col gap-0.5 border-t border-border py-1">
            <Switch label="Ativar este projeto" checked={activate} onChange={(v) => setValue("activate", v)} />
            <span className="text-xs leading-4 text-pretty text-fg-muted">
              {activate
                ? activeProject
                  ? `'${activeProject.name}' deixa de ser o ativo e a Início passa a sugerir as rotinas deste projeto.`
                  : "A Início passa a sugerir as rotinas deste projeto."
                : "Você pode ativar depois."}
            </span>
          </div>
        )}
        <Button type="submit" size="lg" fullWidth disabled={!isValid || submitting} loading={submitting}>
          Salvar
        </Button>
      </form>
    </BottomSheet>
  );
}
