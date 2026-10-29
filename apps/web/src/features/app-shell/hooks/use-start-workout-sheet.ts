"use client";

import { useState } from "react";
import { nextRoutineId } from "@guf/core";
import { useProjectsOverview } from "@/features/projects";

/** O que a folha mostra: as rotinas de um projeto ou a escolha de outro projeto. */
export type StartSheetView = "routines" | "projects";

/**
 * Estado da folha "Iniciar treino": projeto em exibição (abre no ativo; trocar só muda a lista, não
 * ativa), rotina aberta e a destacada como "Próximo". Busca os projetos só depois da primeira abertura
 * e volta ao começo a cada nova abertura.
 * @param isOpen folha aberta agora
 * @param hasTrainedToday já treinou hoje (aí nenhuma rotina é "Próximo")
 */
export function useStartWorkoutSheet(isOpen: boolean, hasTrainedToday: boolean) {
  const [wasOpened, setWasOpened] = useState(isOpen);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const [view, setView] = useState<StartSheetView>("routines");
  const [chosenProjectId, setChosenProjectId] = useState<string | null>(null);
  const [expandedRoutineId, setExpandedRoutineId] = useState<string | null>(null);
  const overview = useProjectsOverview(wasOpened);

  // Abriu de novo: volta ao projeto ativo, à lista e com tudo recolhido.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setWasOpened(true);
      setView("routines");
      setChosenProjectId(null);
      setExpandedRoutineId(null);
    }
  }

  const projects = (overview.data?.projects ?? []).filter((p) => !p.archivedAt);
  const project = projects.find((p) => p.id === chosenProjectId) ?? projects.find((p) => p.isActive) ?? projects[0] ?? null;
  const nextId = project ? nextRoutineId(project.routines, overview.data?.lastFinished?.routineId ?? null, new Date(), hasTrainedToday) : null;

  return {
    status: overview,
    view,
    projects,
    project,
    nextId,
    expandedRoutineId,
    toggleRoutine: (routineId: string) => setExpandedRoutineId((current) => (current === routineId ? null : routineId)),
    showProjects: () => setView("projects"),
    showRoutines: () => setView("routines"),
    chooseProject: (projectId: string) => {
      setChosenProjectId(projectId);
      setExpandedRoutineId(null);
      setView("routines");
    },
  };
}

export type StartWorkoutSheetState = ReturnType<typeof useStartWorkoutSheet>;
