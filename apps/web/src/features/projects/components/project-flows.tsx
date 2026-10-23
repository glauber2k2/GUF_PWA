"use client";

import { useState } from "react";
import { Archive, ArrowDown, ArrowUp, CircleCheck, CircleOff, Pencil, Trash2 } from "lucide-react";
import { activateProjectMessage, archiveProjectMessage, DELETE_ROUTINE_MESSAGE, deleteProjectMessage, moveItem } from "@guf/core";
import type { Project, ProjectRoutine } from "@guf/api";
import { BottomSheet, ConfirmDialog, SheetOption } from "@/shared/components/ds";
import { ProjectFormSheet } from "./project-form-sheet";
import { RoutineNameSheet } from "./routine-name-sheet";
import type { ProjectActions } from "@/features/projects/hooks/use-project-actions";

type OverlayKind =
  | "project-menu"
  | "project-form"
  | "confirm-activate"
  | "confirm-archive"
  | "confirm-delete"
  | "routine-menu"
  | "routine-form"
  | "confirm-archive-routine"
  | "confirm-delete-routine";

interface FlowState {
  overlay: OverlayKind | null;
  /** Alvos ficam guardados ao fechar: o conteúdo some só depois da animação de saída. */
  project: Project | null;
  routine: ProjectRoutine | null;
}

/**
 * Menus, folhas e confirmações das telas de Projetos (lista e detalhe).
 * Regra: trocar o projeto ativo pede confirmação quando já existe outro ativo.
 */
export function useProjectFlows({
  activeProject,
  actions,
  onProjectCreated,
  onProjectArchived,
  onProjectDeleted,
}: {
  activeProject: Project | null;
  actions: ProjectActions;
  onProjectCreated?: (projectId: string) => void;
  onProjectArchived?: (projectId: string) => void;
  onProjectDeleted?: (projectId: string) => void;
}) {
  const [state, setState] = useState<FlowState>({ overlay: null, project: null, routine: null });
  const { overlay, project, routine } = state;
  const open = (next: OverlayKind, target: { project?: Project | null; routine?: ProjectRoutine | null } = {}) =>
    setState({ overlay: next, project: target.project ?? null, routine: target.routine ?? null });
  const close = () => setState((s) => ({ ...s, overlay: null }));

  const requestActivate = (target: Project) => {
    if (activeProject && activeProject.id !== target.id) return open("confirm-activate", { project: target });
    close();
    void actions.activate(target, activeProject);
  };

  const routineIndex = project && routine ? project.routines.findIndex((r) => r.id === routine.id) : -1;
  const moveRoutine = (delta: -1 | 1) => {
    close();
    if (project && routineIndex >= 0) void actions.reorder(moveItem(project.routines, routineIndex, routineIndex + delta));
  };

  const element = (
    <>
      <BottomSheet placement="screen" open={overlay === "project-menu"} onClose={close} title={project?.name}>
        {project && (
          <>
            {/* Favoritos é fixo: sem renomear nem arquivar. */}
            {!project.isFavorites && (
              <SheetOption icon={Pencil} title="Editar nome e descrição" onClick={() => open("project-form", { project })} />
            )}
            {project.isActive ? (
              <SheetOption
                icon={CircleOff}
                title="Desativar projeto"
                subtitle="Você fica sem projeto ativo"
                onClick={() => {
                  close();
                  void actions.deactivate(project);
                }}
              />
            ) : (
              <SheetOption
                icon={CircleCheck}
                title="Ativar projeto"
                subtitle="A Início passa a sugerir estas rotinas"
                onClick={() => requestActivate(project)}
              />
            )}
            {!project.isFavorites && (
              <>
                <SheetOption
                  icon={Archive}
                  title="Arquivar projeto"
                  subtitle="Treinos feitos continuam no histórico"
                  onClick={() => open("confirm-archive", { project })}
                />
                <SheetOption
                  icon={Trash2}
                  title="Excluir projeto"
                  subtitle="Apaga o projeto e as rotinas dele"
                  onClick={() => open("confirm-delete", { project })}
                />
              </>
            )}
          </>
        )}
      </BottomSheet>

      <BottomSheet placement="screen" open={overlay === "routine-menu"} onClose={close} title={routine?.name}>
        {project && routine && (
          <>
            <SheetOption icon={Pencil} title="Renomear" onClick={() => open("routine-form", { project, routine })} />
            {routineIndex > 0 && <SheetOption icon={ArrowUp} title="Mover para cima" onClick={() => moveRoutine(-1)} />}
            {routineIndex >= 0 && routineIndex < project.routines.length - 1 && (
              <SheetOption icon={ArrowDown} title="Mover para baixo" onClick={() => moveRoutine(1)} />
            )}
            <SheetOption
              icon={Archive}
              title="Arquivar rotina"
              subtitle="Treinos feitos continuam no histórico"
              onClick={() => open("confirm-archive-routine", { project, routine })}
            />
            <SheetOption
              icon={Trash2}
              title="Excluir rotina"
              subtitle="Treinos feitos continuam no histórico"
              onClick={() => open("confirm-delete-routine", { project, routine })}
            />
          </>
        )}
      </BottomSheet>

      <ProjectFormSheet
        open={overlay === "project-form"}
        project={project ?? undefined}
        activeProject={activeProject}
        onClose={close}
        onSaved={(projectId, created) => {
          close();
          if (created) onProjectCreated?.(projectId);
        }}
      />

      <RoutineNameSheet open={overlay === "routine-form"} project={project} routine={routine} onClose={close} />

      <ConfirmDialog
        placement="screen"
        open={overlay === "confirm-activate"}
        title="Ativar projeto?"
        message={activeProject && project ? activateProjectMessage(activeProject.name, project.name) : ""}
        cancelLabel="Cancelar"
        confirmLabel="Ativar"
        onCancel={close}
        onConfirm={() => {
          close();
          if (project) void actions.activate(project, activeProject);
        }}
      />
      <ConfirmDialog
        placement="screen"
        open={overlay === "confirm-archive"}
        title="Arquivar projeto?"
        message={archiveProjectMessage(project?.isActive ?? false)}
        cancelLabel="Cancelar"
        confirmLabel="Arquivar"
        destructive
        onCancel={close}
        onConfirm={async () => {
          close();
          if (project && (await actions.archive(project))) onProjectArchived?.(project.id);
        }}
      />
      <ConfirmDialog
        placement="screen"
        open={overlay === "confirm-delete"}
        title={project ? `Excluir '${project.name}'?` : "Excluir projeto?"}
        message={deleteProjectMessage(project?.routines.length ?? 0)}
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        destructive
        onCancel={close}
        onConfirm={async () => {
          close();
          if (project && (await actions.remove(project))) onProjectDeleted?.(project.id);
        }}
      />
      <ConfirmDialog
        placement="screen"
        open={overlay === "confirm-archive-routine"}
        title="Arquivar rotina?"
        message="Seus treinos já feitos com esta rotina continuam no histórico. Você pode restaurar depois."
        cancelLabel="Cancelar"
        confirmLabel="Arquivar"
        destructive
        onCancel={close}
        onConfirm={() => {
          close();
          if (routine) void actions.archiveRoutine(routine);
        }}
      />
      <ConfirmDialog
        placement="screen"
        open={overlay === "confirm-delete-routine"}
        title={routine ? `Excluir '${routine.name}'?` : "Excluir rotina?"}
        message={DELETE_ROUTINE_MESSAGE}
        cancelLabel="Cancelar"
        confirmLabel="Excluir"
        destructive
        onCancel={close}
        onConfirm={() => {
          close();
          if (routine) void actions.removeRoutine(routine);
        }}
      />
    </>
  );

  return {
    element,
    requestActivate,
    /** Novo projeto: `project` vazio indica criação. */
    openNewProject: () => open("project-form"),
    openProjectMenu: (target: Project) => open("project-menu", { project: target }),
    requestDelete: (target: Project) => open("confirm-delete", { project: target }),
    openRoutineMenu: (target: Project, targetRoutine: ProjectRoutine) => open("routine-menu", { project: target, routine: targetRoutine }),
  };
}
