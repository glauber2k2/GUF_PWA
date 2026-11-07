"use client";

import { Plus } from "lucide-react";
import type { RoutineSummary } from "@guf/api";
import { Banner, BottomSheet, SheetOption, Skeleton } from "@/shared/components/ds";
import { useProjectsOverview } from "@/features/projects";

export interface CopyRoutineSheetProps {
  /** Rotina a copiar; null = painel fechado. */
  routine: RoutineSummary | null;
  isCopying: boolean;
  onPick: (target: { id: string; name: string } | null) => void;
  onClose: () => void;
}

function routinesLabel(count: number, isActive: boolean): string {
  const routines = count === 1 ? "1 rotina" : `${count} rotinas`;
  return isActive ? `${routines} · ativo` : routines;
}

/** "Copiar rotina": escolha o projeto seu que recebe a rotina, ou um projeto novo só com ela. */
export function CopyRoutineSheet({ routine, isCopying, onPick, onClose }: CopyRoutineSheetProps) {
  const overview = useProjectsOverview(routine !== null);
  const projects = (overview.data?.projects ?? []).filter((project) => !project.archivedAt);
  return (
    <BottomSheet placement="screen" open={routine !== null} onClose={onClose} title="Copiar rotina" subtitle={routine?.name}>
      <div aria-busy={isCopying} className="flex flex-col gap-2">
        <p className="m-0 text-sm leading-5 text-fg-secondary">Escolha o projeto que vai receber a rotina.</p>
        {overview.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void overview.refetch()}>
            Não foi possível carregar seus projetos. Verifique a internet e tente de novo.
          </Banner>
        ) : overview.isPending ? (
          <>
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </>
        ) : (
          projects.map((project) => (
            <SheetOption
              key={project.id}
              letter={project.name.charAt(0).toUpperCase()}
              title={project.name}
              subtitle={routinesLabel(project.routines.length, project.isActive)}
              disabled={isCopying}
              onClick={() => onPick({ id: project.id, name: project.name })}
            />
          ))
        )}
        <SheetOption icon={Plus} title="Novo projeto" subtitle="Cria um projeto só com esta rotina" dashed disabled={isCopying} onClick={() => onPick(null)} />
        <p className="m-0 pt-1 text-xs leading-4 text-pretty text-fg-muted">
          Séries, repetições e descanso vêm junto. As cargas e as observações não: o treino começa com as suas.
        </p>
      </div>
    </BottomSheet>
  );
}
