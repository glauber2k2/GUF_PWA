"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanImportDraft } from "@guf/api";
import { Banner, Skeleton } from "@/shared/components/ds";
import { EditorFrame } from "@/shared/components/editor-frame";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { clearPendingPlanImport, peekPendingPlanImport } from "@/store/global/plan-import.store";
import { PROJECTS_PATH, useProjectsOverview, useProjectsSource } from "@/features/projects";
import { PlanImportPasteStep } from "@/features/plan-import/components/plan-import-paste-step";
import { PlanImportReview } from "@/features/plan-import/components/plan-import-review";

/**
 * /projetos/importar: colar a ficha e converter (etapa 1) ou, vindo do chat do GUF AI com a ficha já
 * convertida, direto para a revisão (etapa 2). Só online, como o resto de Projetos.
 */
export function PlanImportScreen() {
  const router = useRouter();
  const overview = useProjectsOverview();
  const { dev } = useProjectsSource();
  const [draft, setDraft] = useState<PlanImportDraft | null>(peekPendingPlanImport);
  const leave = () => router.push(withDevState(PROJECTS_PATH));

  // A ficha vinda do chat é usada uma vez: voltar a esta tela depois começa do zero.
  useEffect(() => clearPendingPlanImport(), []);

  if (!draft) return <PlanImportPasteStep onBack={leave} onConverted={setDraft} />;

  if (dev.forceLoading || overview.isPending) {
    return (
      <EditorFrame title="Revisar ficha" onBack={leave}>
        <div aria-busy="true" aria-label="Carregando projetos" className="flex flex-col gap-4">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-[220px] rounded-lg" />
        </div>
      </EditorFrame>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <EditorFrame title="Revisar ficha" onBack={leave}>
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void overview.refetch()}>
          Não foi possível carregar seus projetos. Verifique a internet e tente de novo.
        </Banner>
      </EditorFrame>
    );
  }

  const projects = overview.data.projects.filter((project) => !project.archivedAt);
  return <PlanImportReview initial={draft} projects={projects} onDiscard={leave} />;
}
