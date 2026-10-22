"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanImportDestination, PlanImportDraft, Project } from "@guf/api";
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

/** Revisão da ficha convertida: edições no rascunho, destino e "Criar" (uma transação no banco). */
export function usePlanImportReview(initial: PlanImportDraft, projects: readonly Project[]) {
  const router = useRouter();
  const shell = useAppShell();
  const gate = usePlanGate();
  const canEdit = useCanEditPlanning();
  const importPlan = useImportTrainingPlan();
  const [draft, dispatch] = useReducer(planImportDraftReducer, initial);
  const [destination, setDestination] = useState<PlanImportDestination>(() => initialDestination(projects, gate.entitlements));

  // Projeto existente: o nome do rascunho não é usado (e o campo some da tela), então não pode barrar.
  const existing = destination.kind === "existing" ? projects.find((project) => project.id === destination.projectId) : undefined;
  const validation = planImportDraftSchema.safeParse(existing ? { ...draft, projectName: existing.name } : draft);
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
    counts,
    /** Primeiro problema do rascunho (nome vazio, rotina sem exercícios…); null = pode criar. */
    validationError: validation.success ? null : (validation.error.issues[0]?.message ?? "Confira a ficha antes de criar."),
    canEdit,
    isSaving: importPlan.isPending,
    saveError,
    create,
  };
}
