"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus } from "lucide-react";
import { groupProjects, highlightedRoutine, toLocalISODate } from "@guf/core";
import type { ProjectsOverview } from "@guf/api";
import { AppHeader, Banner, Button, EmptyState, LargeTitle } from "@/shared/components/ds";
import { useProjectsOverview, useProjectsSource } from "@/features/projects/api/use-projects";
import { useScrolled } from "@/shared/hooks/use-scrolled";
import { OfflineEditBanner } from "@/features/projects/components/offline-edit-banner";
import { PlanImportEntry } from "@/features/projects/components/plan-import-entry";
import { projectDetailPath } from "@/features/projects/helpers/paths";
import { ActiveProjectCard, ArchivedProjects, NoActiveProjectCard, ProjectListItem, SectionLabel } from "@/features/projects/components/project-cards";
import { useProjectFlows } from "@/features/projects/components/project-flows";
import { ProjectsSkeleton } from "@/features/projects/components/projects-skeleton";
import { useProjectActions } from "@/features/projects/hooks/use-project-actions";
import { TOUR_TARGETS } from "@/features/onboarding";

/** Aba Projetos: projeto ativo em destaque, outros projetos e arquivados. */
export function ProjectsScreen() {
  const scrolled = useScrolled();
  const overview = useProjectsOverview();
  const { dev } = useProjectsSource();
  const actions = useProjectActions();
  const loading = dev.forceLoading || overview.isPending;

  return (
    <main className="flex flex-col px-4">
      <div className="sticky top-0 z-[5] -mx-4 pt-[env(safe-area-inset-top)]">
        <AppHeader title="Projetos" collapsed={scrolled} />
      </div>
      {loading ? (
        <ListLayout canEdit={actions.canEdit} onNew={null}>
          <ProjectsSkeleton />
        </ListLayout>
      ) : overview.isError || !overview.data ? (
        <ListLayout canEdit={actions.canEdit} onNew={null}>
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void overview.refetch()}>
            Não foi possível carregar seus projetos. Verifique a internet e tente de novo.
          </Banner>
        </ListLayout>
      ) : (
        <ProjectsContent overview={overview.data} actions={actions} />
      )}
    </main>
  );
}

/** Título + "Novo projeto" + aviso sem conexão + importar ficha, comum a todos os estados da lista. */
function ListLayout({ canEdit, onNew, children }: { canEdit: boolean; onNew: (() => void) | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="mt-1 flex flex-none items-center justify-between gap-3">
        <LargeTitle className="m-0">Projetos</LargeTitle>
        {onNew && (
          <Button data-tour={TOUR_TARGETS.newProject} variant="secondary" icon={Plus} disabled={!canEdit} onClick={onNew} className="rounded-pill">
            Novo projeto
          </Button>
        )}
      </div>
      {!canEdit && <OfflineEditBanner />}
      <PlanImportEntry disabled={!canEdit} />
      {children}
    </div>
  );
}

function ProjectsContent({ overview, actions }: { overview: ProjectsOverview; actions: ReturnType<typeof useProjectActions> }) {
  const router = useRouter();
  const { active, others, archived } = groupProjects(overview.projects);
  const now = new Date();
  const next = active ? highlightedRoutine(active.routines, overview.lastFinished, now, toLocalISODate(now)) : null;
  const disabled = !actions.canEdit || actions.busy;
  const flows = useProjectFlows({
    activeProject: active,
    actions,
    onProjectCreated: (id) => router.push(projectDetailPath(id)),
  });
  const isNew = overview.projects.length === 0;

  return (
    <ListLayout canEdit={actions.canEdit} onNew={isNew ? null : flows.openNewProject}>
      {isNew ? (
        <div className="animate-guf-rise pt-6">
          <EmptyState
            icon={ClipboardList}
            title="Monte seu primeiro projeto"
            message="Agrupe suas rotinas (ex.: Treino A, B e C) e a Início sugere o treino de cada dia."
            actionLabel={actions.canEdit ? "Criar projeto" : undefined}
            onAction={flows.openNewProject}
          />
        </div>
      ) : (
        <>
          {active ? (
            <div data-tour={TOUR_TARGETS.activeProject}>
              <ActiveProjectCard
                project={active}
                nextRoutine={next?.routine ?? null}
                nextLabel={next?.label ?? "Hoje"}
                disabled={disabled}
                onOpen={() => router.push(projectDetailPath(active.id))}
                onMenu={() => flows.openProjectMenu(active)}
              />
            </div>
          ) : (
            others.length > 0 && <NoActiveProjectCard />
          )}

          {others.length > 0 && (
            <>
              <SectionLabel className="mt-3">{active ? "Outros projetos" : "Seus projetos"}</SectionLabel>
              {others.map((p, i) => (
                <ProjectListItem
                  key={p.id}
                  project={p}
                  index={i}
                  disabled={disabled}
                  onOpen={() => router.push(projectDetailPath(p.id))}
                  onActivate={() => flows.requestActivate(p)}
                  onMenu={() => flows.openProjectMenu(p)}
                />
              ))}
            </>
          )}

          {archived.length > 0 && (
            <ArchivedProjects projects={archived} disabled={disabled} onRestore={(p) => void actions.restore(p)} onDelete={flows.requestDelete} />
          )}
        </>
      )}
      {flows.element}
    </ListLayout>
  );
}
