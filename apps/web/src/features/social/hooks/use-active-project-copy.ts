"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiError, RoutineSummary } from "@guf/api";
import { useAppShell } from "@/features/app-shell";
import { usePlanGate } from "@/features/plans";
import { projectDetailPath, useCanEditPlanning } from "@/features/projects";
import { useCopyMemberProject, useCopyMemberRoutine } from "@/features/social/api/use-social";

/** Painel aberto: o projeto (rotinas lado a lado), o destino de uma rotina ou a confirmação do projeto inteiro. */
export type ActiveProjectPanel = { kind: "closed" } | { kind: "project" } | { kind: "routine"; routine: RoutineSummary } | { kind: "copy-project" };

/**
 * Copiar do perfil de outra pessoa (Claude Design "Perfil - Projeto Ativo" · 2c): uma rotina para um
 * projeto seu (ou um novo) ou o projeto inteiro. Só online, como toda edição de projetos.
 * Limite do plano → tela do Pro; sucesso → aviso com "Ver" (abre o projeto que recebeu a cópia).
 */
export function useActiveProjectCopy(ownerId: string | null, projectName: string) {
  const router = useRouter();
  const { showToast } = useAppShell();
  const { handlePlanError } = usePlanGate();
  const canEdit = useCanEditPlanning();
  const copyRoutine = useCopyMemberRoutine();
  const copyProject = useCopyMemberProject();
  const [panel, setPanel] = useState<ActiveProjectPanel>({ kind: "closed" });

  const close = () => setPanel({ kind: "closed" });

  const showCopied = (title: string, message: string, projectId: string) => {
    close();
    showToast(title, { tone: "success", message, actionLabel: "Ver", onAction: () => router.push(projectDetailPath(projectId)) });
  };

  const showFailure = (error: ApiError, fallback: "custom_projects" | "routines_per_project") => {
    if (handlePlanError(error, fallback)) {
      close();
      return;
    }
    showToast("Não foi possível copiar", { tone: "error", message: error.message });
  };

  /** Rotina escolhida → projeto de destino (null = projeto novo com o nome da rotina). */
  const copyRoutineTo = (routine: RoutineSummary, target: { id: string; name: string } | null) => {
    copyRoutine.mutate(
      { routineId: routine.id, targetProjectId: target?.id ?? null },
      {
        onSuccess: ({ projectId }) =>
          showCopied(
            "Rotina copiada",
            target ? `${routine.name} entrou em ${target.name}.` : `Criado o projeto “${routine.name}” com esta rotina.`,
            projectId,
          ),
        onError: (error) => showFailure(error, target ? "routines_per_project" : "custom_projects"),
      },
    );
  };

  const copyWholeProject = (activate: boolean) => {
    if (!ownerId) return;
    copyProject.mutate(
      { userId: ownerId, activate },
      {
        onSuccess: ({ projectId }) =>
          showCopied("Projeto copiado", activate ? `${projectName} já é o seu projeto ativo.` : `${projectName} está em Projetos.`, projectId),
        onError: (error) => showFailure(error, "custom_projects"),
      },
    );
  };

  return {
    panel,
    openProject: () => setPanel({ kind: "project" }),
    openRoutineCopy: (routine: RoutineSummary) => setPanel({ kind: "routine", routine }),
    openProjectCopy: () => setPanel({ kind: "copy-project" }),
    close,
    canCopy: canEdit,
    copyRoutineTo,
    copyWholeProject,
    isCopyingRoutine: copyRoutine.isPending,
    isCopyingProject: copyProject.isPending,
  };
}

export type ActiveProjectCopy = ReturnType<typeof useActiveProjectCopy>;
