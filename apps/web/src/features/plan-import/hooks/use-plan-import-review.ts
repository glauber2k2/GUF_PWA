"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanImportDestination, PlanImportDraft, Project, ProjectRoutine } from "@guf/api";
import { countCustomProjects, hasRoomFor, planImportCounts, planImportSummary, type Entitlements } from "@guf/core";
import { planImportDraftSchema } from "@guf/schemas";
import { useAppShell } from "@/features/app-shell";
import { usePlanGate } from "@/features/plans";
import { projectDetailPath, useCanEditPlanning } from "@/features/projects";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { flushOutbox } from "@/shared/offline/outbox";
import { useImportTrainingPlan } from "@/features/plan-import/api/use-plan-import";
import { planImportDraftReducer } from "@/features/plan-import/helpers/plan-import-draft";

/** Projeto novo quando o plano permite; senão o Favoritos (a pessoa ainda pode tentar o novo e ver o Pro). */
function initialDestination(projects: readonly Project[], entitlements: Entitlements | null): PlanImportDestination {
  const fallback = projects.find((project) => project.isFavorites) ?? projects[0];
  if (hasRoomFor(entitlements, "custom_projects", countCustomProjects(projects)) || !fallback) return { kind: "new", activate: true };
  return { kind: "existing", projectId: fallback.id };
}

/**
 * O que vai para a validação: no projeto existente o nome do projeto e o das rotinas que recebem os
 * exercícios são os que já existem (os campos somem da tela, então não podem barrar).
 */
function draftForValidation(draft: PlanImportDraft, project: Project | undefined): PlanImportDraft {
  if (!project) return draft;
  const names = new Map(project.routines.map((routine) => [routine.id, routine.name]));
  return {
    ...draft,
    projectName: project.name,
    routines: draft.routines.map((routine) => (routine.intoRoutineId ? { ...routine, name: names.get(routine.intoRoutineId) ?? routine.name } : routine)),
  };
}

/** Revisão da ficha convertida: edições no rascunho, destino e "Criar" (uma transação no banco). */
export function usePlanImportReview(initial: PlanImportDraft, projects: readonly Project[]) {
  const router = useRouter();
  const shell = useAppShell();
  const gate = usePlanGate();
  const canEdit = useCanEditPlanning();
  const importPlan = useImportTrainingPlan();
  const [draft, dispatch] = useReducer(planImportDraftReducer, initial);
  const [destination, setDestinationState] = useState<PlanImportDestination>(() => initialDestination(projects, gate.entitlements));

  const existing = destination.kind === "existing" ? projects.find((project) => project.id === destination.projectId) : undefined;
  const validation = planImportDraftSchema.safeParse(draftForValidation(draft, existing));
  /** Rotinas que podem receber os exercícios da ficha (só num projeto que já existe). */
  const targetRoutines: readonly ProjectRoutine[] = existing?.routines ?? [];

  const setDestination = (next: PlanImportDestination) => {
    const projectChanged = next.kind !== destination.kind || (next.kind === "existing" && destination.kind === "existing" && next.projectId !== destination.projectId);
    if (projectChanged) dispatch({ type: "clearRoutineTargets" });
    setDestinationState(next);
  };
  const counts = planImportCounts(draft.routines);

  const create = async () => {
    if (!validation.success || importPlan.isPending) return;
    if (destination.kind === "new" && !gate.allowAnother("custom_projects", countCustomProjects(projects))) return;
    // Exercício criado no seletor durante a revisão entra pela fila offline: precisa estar no banco antes.
    await flushOutbox();
    importPlan.mutate(
      { draft: validation.data, destination },
      {
        onSuccess: ({ projectId }) => {
          shell.showToast("Ficha importada", { tone: "success", message: planImportSummary(counts) });
          router.replace(withDevState(projectDetailPath(projectId)));
        },
        onError: (error) => {
          gate.handlePlanError(error, destination.kind === "new" ? "custom_projects" : "routines_per_project");
        },
      },
    );
  };

  const saveError = importPlan.error?.code === "plan_limit" ? null : importPlan.error;

  return {
    draft,
    dispatch,
    destination,
    setDestination,
    targetRoutines,
    counts,
    /** Primeiro problema do rascunho (nome vazio, rotina sem exercícios…); null = pode criar. */
    validationError: validation.success ? null : (validation.error.issues[0]?.message ?? "Confira a ficha antes de criar."),
    canEdit,
    isSaving: importPlan.isPending,
    saveError,
    create,
  };
}
