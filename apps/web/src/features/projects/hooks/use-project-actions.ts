"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Check, CircleCheck, CircleOff, Trash2, WifiOff, type LucideIcon } from "lucide-react";
import { changedPositions, OFFLINE_EDIT_MESSAGE } from "@guf/core";
import type { ApiResult, GufClient, Project, ProjectRoutine } from "@guf/api";
import { useAppShell, type ToastOptions } from "@/features/app-shell";
import { usePlanGate } from "@/features/plans";
import { useCanEditPlanning, useProjectsSource } from "@/features/projects/api/use-projects";
import { invalidatePlanningData } from "@/shared/libs/query-keys";
import { getSupabaseClient } from "@/shared/libs/supabase";

/** Aviso de quem tenta editar sem internet (edição de projetos/rotinas é só online). */
export const OFFLINE_TOAST: [string, ToastOptions] = [
  "Sem conexão",
  { tone: "warning", icon: WifiOff, message: OFFLINE_EDIT_MESSAGE.charAt(0).toUpperCase() + OFFLINE_EDIT_MESSAGE.slice(1) },
];

type Operation = (client: GufClient) => Promise<ApiResult<unknown>>;

interface Feedback {
  message: string;
  icon: LucideIcon;
  /** Operação que desfaz a ação (botão "Desfazer" no toast). */
  undo?: Operation;
}

/**
 * Ações de projetos e rotinas que não usam formulário (ativar, arquivar, reordenar…):
 * só com internet; sucesso recarrega Projetos e Início e mostra o toast (com "Desfazer" quando houver);
 * erro vira toast com a mensagem pronta (sem conexão → aviso de edição só online).
 */
export function useProjectActions() {
  const { api } = useProjectsSource();
  const queryClient = useQueryClient();
  const shell = useAppShell();
  const canEdit = useCanEditPlanning();
  const gate = usePlanGate();
  const [busy, setBusy] = useState(false);

  const run = async (operation: Operation, feedback?: Feedback): Promise<boolean> => {
    if (!canEdit) {
      shell.showToast(...OFFLINE_TOAST);
      return false;
    }
    setBusy(true);
    const { error } = await operation(getSupabaseClient());
    setBusy(false);
    if (error) {
      // Restaurar projeto ou rotina acima do limite do plano (ex.: "Desfazer" de um arquivamento).
      if (gate.handlePlanError(error, "routines_per_project")) return false;
      if (error.code === "network_error") shell.showToast(...OFFLINE_TOAST);
      else shell.showToast(error.message, { tone: "error" });
      await invalidatePlanningData(queryClient);
      return false;
    }
    await invalidatePlanningData(queryClient);
    if (feedback) {
      const undo = feedback.undo;
      shell.showToast(feedback.message, {
        tone: undo ? "undo" : "success",
        icon: feedback.icon,
        actionLabel: undo ? "Desfazer" : undefined,
        onAction: undo ? () => void run(undo) : undefined,
      });
    }
    return true;
  };

  return {
    busy,
    canEdit,
    /** Ativa `project`; desfazer volta para o ativo anterior (ou para nenhum). */
    activate: (project: Project, previous: Project | null) =>
      run((c) => api.activateProject(c, { projectId: project.id }), {
        message: "Projeto ativado",
        icon: CircleCheck,
        undo: (c) => (previous ? api.activateProject(c, { projectId: previous.id }) : api.deactivateProject(c, { projectId: project.id })),
      }),
    deactivate: (project: Project) =>
      run((c) => api.deactivateProject(c, { projectId: project.id }), {
        message: "Projeto desativado",
        icon: CircleOff,
        undo: (c) => api.activateProject(c, { projectId: project.id }),
      }),
    /** Arquiva; desfazer restaura e, se era o ativo, ativa de novo. */
    archive: (project: Project) =>
      run((c) => api.archiveProject(c, { projectId: project.id }), {
        message: "Projeto arquivado",
        icon: Archive,
        undo: async (c) => {
          const restored = await api.restoreProject(c, { projectId: project.id });
          return restored.error || !project.isActive ? restored : api.activateProject(c, { projectId: project.id });
        },
      }),
    restore: (project: Project) =>
      run((c) => api.restoreProject(c, { projectId: project.id }), {
        message: "Projeto restaurado",
        icon: ArchiveRestore,
        undo: (c) => api.archiveProject(c, { projectId: project.id }),
      }),
    /** Exclui o projeto e as rotinas dele (sem "Desfazer": a confirmação avisa antes). */
    remove: (project: Project) => run((c) => api.deleteProject(c, { projectId: project.id }), { message: "Projeto excluído", icon: Trash2 }),
    archiveRoutine: (routine: ProjectRoutine) =>
      run((c) => api.archiveRoutine(c, { routineId: routine.id }), {
        message: "Rotina arquivada",
        icon: Archive,
        undo: (c) => api.restoreRoutine(c, { routineId: routine.id }),
      }),
    /** Exclui a rotina (sem "Desfazer": a confirmação avisa antes). */
    removeRoutine: (routine: ProjectRoutine) =>
      run((c) => api.deleteRoutine(c, { routineId: routine.id }), { message: "Rotina excluída", icon: Trash2 }),
    /** Grava a nova ordem (só as positions que mudaram). */
    reorder: (ordered: ProjectRoutine[]) => {
      const positions = changedPositions(ordered);
      if (positions.length === 0) return Promise.resolve(true);
      return run((c) => api.reorderRoutines(c, { positions }), { message: "Ordem salva", icon: Check });
    },
  };
}

export type ProjectActions = ReturnType<typeof useProjectActions>;
