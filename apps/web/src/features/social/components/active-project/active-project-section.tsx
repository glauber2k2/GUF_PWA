"use client";

import type { MemberProfile } from "@guf/api";
import { useMemberActiveProject } from "@/features/social/api/use-social";
import { useActiveProjectCopy } from "@/features/social/hooks/use-active-project-copy";
import { ActiveProjectRow } from "@/features/social/components/active-project/active-project-row";
import { ActiveProjectSheet } from "@/features/social/components/active-project/active-project-sheet";
import { CopyProjectSheet } from "@/features/social/components/active-project/copy-project-sheet";
import { CopyRoutineSheet } from "@/features/social/components/active-project/copy-routine-sheet";

/**
 * Projeto ativo no perfil: só com o histórico visível (a mesma opção "Visibilidade de treino"
 * controla os dois). Discreto: carregando, sem projeto ou com erro, não ocupa espaço.
 * De outra pessoa, as rotinas e o projeto podem ser copiados (um painel por vez).
 */
export function ActiveProjectSection({ userId, profile }: { userId: string | null; profile: MemberProfile }) {
  const project = useMemberActiveProject(userId, profile.historyVisible);
  const copy = useActiveProjectCopy(userId, project.data?.name ?? "");
  if (!project.data) return null;
  const { panel } = copy;
  const canCopyFrom = !profile.isSelf && userId !== null;
  return (
    <>
      <ActiveProjectRow project={project.data} onOpen={copy.openProject} />
      <ActiveProjectSheet
        project={project.data}
        handle={profile.handle}
        isSelf={profile.isSelf}
        historyHidden={profile.historyHidden}
        open={panel.kind === "project"}
        onClose={copy.close}
        copyActions={
          canCopyFrom ? { canCopy: copy.canCopy, onCopyRoutine: copy.openRoutineCopy, onCopyProject: copy.openProjectCopy } : undefined
        }
      />
      {canCopyFrom && (
        <>
          <CopyRoutineSheet
            routine={panel.kind === "routine" ? panel.routine : null}
            isCopying={copy.isCopyingRoutine}
            onPick={(target) => panel.kind === "routine" && copy.copyRoutineTo(panel.routine, target)}
            onClose={copy.openProject}
          />
          <CopyProjectSheet
            project={project.data}
            handle={profile.handle}
            open={panel.kind === "copy-project"}
            isCopying={copy.isCopyingProject}
            onCopy={copy.copyWholeProject}
            onClose={copy.openProject}
          />
        </>
      )}
    </>
  );
}
