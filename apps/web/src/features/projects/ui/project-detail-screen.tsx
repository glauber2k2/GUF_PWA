"use client";

import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ChevronLeft, CircleCheck, Ellipsis, ListPlus, Plus, SearchX } from "lucide-react";
import { groupProjects, highlightedRoutine, projectMeta, toLocalISODate } from "@guf/core";
import type { Project, ProjectsOverview } from "@guf/api";
import { Banner, Button, EmptyState, IconButton, SheetOption, Skeleton } from "@/shared/components/ds";
import { useProjectsOverview, useProjectsSource } from "@/features/projects/api/use-projects";
import { OfflineEditBanner } from "@/features/projects/components/offline-edit-banner";
import { newRoutinePath, PROJECTS_PATH, routinePath } from "@/features/projects/helpers/paths";
import { ActiveBadge, SectionLabel } from "@/features/projects/components/project-cards";
import { useProjectFlows } from "@/features/projects/components/project-flows";
import { RoutineList } from "@/features/projects/components/routine-list";
import { useProjectActions, type ProjectActions } from "@/features/projects/hooks/use-project-actions";
import { BOTTOM_BAR_PROPS } from "@/shared/hooks/use-bottom-clearance";

/** /projetos/detalhe?id=… — rotinas do projeto (ordem, criar, renomear, arquivar) e ativação. */
export function ProjectDetailScreen() {
  const router = useRouter();
  const projectId = useSearchParams().get("id");
  const overview = useProjectsOverview();
  const { dev } = useProjectsSource();
  const actions = useProjectActions();
  const project = overview.data?.projects.find((p) => p.id === projectId) ?? null;
  const back = () => router.push(PROJECTS_PATH);

  if (dev.forceLoading || overview.isPending) {
    return (
      <DetailFrame title="Projeto" onBack={back}>
        <div aria-busy="true" aria-label="Carregando projeto" className="flex flex-col gap-3">
          <Skeleton className="h-8 w-3/4 rounded-sm" />
          <Skeleton className="w-1/2" />
          <Skeleton className="mt-3 h-[72px] rounded-lg" />
          <Skeleton className="h-[72px] rounded-lg" />
        </div>
      </DetailFrame>
    );
  }
  if (overview.isError || !overview.data) {
    return (
      <DetailFrame title="Projeto" onBack={back}>
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void overview.refetch()}>
          Não foi possível carregar seus projetos. Verifique a internet e tente de novo.
        </Banner>
      </DetailFrame>
    );
  }
  if (!project) {
    return (
      <DetailFrame title="Projeto" onBack={back}>
        <EmptyState icon={SearchX} title="Projeto não encontrado" message="Ele pode ter sido apagado. Volte para a lista de projetos." actionLabel="Ver projetos" onAction={back} />
      </DetailFrame>
    );
  }
  if (project.archivedAt) {
    return (
      <DetailFrame title={project.name} onBack={back}>
        <EmptyState
          icon={Archive}
          title="Projeto arquivado"
          message="Restaure o projeto para ver e editar as rotinas. Os treinos feitos continuam no histórico."
          actionLabel={actions.canEdit ? "Restaurar projeto" : undefined}
          onAction={() => void actions.restore(project)}
        />
      </DetailFrame>
    );
  }
  return <DetailContent project={project} overview={overview.data} actions={actions} onBack={back} />;
}

function DetailContent({
  project,
  overview,
  actions,
  onBack,
}: {
  project: Project;
  overview: ProjectsOverview;
  actions: ProjectActions;
  onBack: () => void;
}) {
  const router = useRouter();
  const newRoutine = () => router.push(newRoutinePath(project.id));
  const { active } = groupProjects(overview.projects);
  const disabled = !actions.canEdit || actions.busy;
  const flows = useProjectFlows({ activeProject: active, actions, onProjectArchived: onBack, onProjectDeleted: onBack });
  const now = new Date();
  const next = project.isActive ? highlightedRoutine(project.routines, overview.lastFinished, now, toLocalISODate(now)) : null;
  const showActivateBar = !project.isActive;

  // Barra "Ativar este projeto" fixa acima do menu: o toast sobe para não cobri-la.

  return (
    <DetailFrame
      title={project.name}
      onBack={onBack}
      badge={project.isActive ? <ActiveBadge className="animate-guf-pop-in" /> : null}
      menu={<IconButton icon={Ellipsis} variant="ghost" label="Opções do projeto" disabled={disabled} onClick={() => flows.openProjectMenu(project)} />}
      bottomBar={
        showActivateBar ? (
          <Button size="lg" icon={CircleCheck} fullWidth disabled={disabled} onClick={() => flows.requestActivate(project)}>
            Ativar este projeto
          </Button>
        ) : null
      }
    >
      {!actions.canEdit && <OfflineEditBanner />}
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-pretty">{project.name}</h1>
        {project.description && <span className="text-[15px] leading-[22px] text-pretty text-fg-secondary">{project.description}</span>}
        <span className="text-[13px] leading-[18px] text-fg-muted tabular-nums">
          {projectMeta(project.routines.length)}
          {project.isActive ? " · a Início sugere a próxima" : ""}
        </span>
      </div>

      {project.routines.length > 0 ? (
        <>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <SectionLabel>Rotinas</SectionLabel>
            {actions.canEdit && <span className="text-xs text-fg-muted">Arraste pela alça para reordenar</span>}
          </div>
          <RoutineList
            routines={project.routines}
            nextRoutineId={next?.routine?.id ?? null}
            nextLabel={next?.label ?? "Hoje"}
            disabled={disabled}
            onOpen={(r) => router.push(routinePath(r.id))}
            onMenu={(r) => flows.openRoutineMenu(project, r)}
            onReorder={actions.reorder}
          />
          {actions.canEdit && <SheetOption icon={Plus} title="Nova rotina" dashed onClick={newRoutine} />}
        </>
      ) : (
        <div className="mt-3 animate-guf-rise-fast">
          <EmptyState
            icon={ListPlus}
            title="Nenhuma rotina ainda"
            message="Crie as rotinas deste projeto, como Treino A, B e C."
            actionLabel={actions.canEdit ? "Nova rotina" : undefined}
            onAction={newRoutine}
          />
        </div>
      )}
      {flows.element}
    </DetailFrame>
  );
}

/** Moldura do detalhe: header fixo (voltar, nome, selo e menu), conteúdo e barra de ação opcional. */
function DetailFrame({
  title,
  onBack,
  badge,
  menu,
  bottomBar,
  children,
}: {
  title: string;
  onBack: () => void;
  badge?: ReactNode;
  menu?: ReactNode;
  bottomBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={bottomBar ? "pb-[76px]" : undefined}>
      <header className="sticky top-0 z-[5] border-b border-border bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <div className="flex h-14 items-center gap-1.5 px-1.5">
          <IconButton icon={ChevronLeft} variant="ghost" label="Voltar para Projetos" onClick={onBack} />
          <span className="min-w-0 flex-1 truncate text-base leading-[22px] font-semibold">{title}</span>
          {badge}
          {menu}
        </div>
      </header>
      <div className="flex animate-guf-rise flex-col gap-3 px-4 pt-3">{children}</div>
      {bottomBar && (
        <div {...BOTTOM_BAR_PROPS} className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[8] border-t border-border bg-background/92 backdrop-blur-[12px]">
          <div className="mx-auto max-w-[430px] px-4 py-3">{bottomBar}</div>
        </div>
      )}
    </main>
  );
}
