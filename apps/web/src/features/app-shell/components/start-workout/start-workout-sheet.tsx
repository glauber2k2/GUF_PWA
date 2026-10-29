"use client";

import { ListPlus, Play, Plus } from "lucide-react";
import { plural, startedAgoLabel } from "@guf/core";
import { Banner, BottomSheet, Icon, SheetOption, Skeleton } from "@/shared/components/ds";
import { useStartWorkoutSheet, type StartWorkoutSheetState } from "@/features/app-shell/hooks/use-start-workout-sheet";
import { ProjectPickerList } from "./project-picker-list";
import { ProjectSwitchButton } from "./project-switch-button";
import { StartRoutineCard } from "./start-routine-card";
import { StartSheetHeader } from "./start-sheet-header";

export interface InProgressWorkout {
  id: string;
  name: string;
  startedAt: string;
}

export interface StartWorkoutSheetProps {
  open: boolean;
  onClose: () => void;
  /** Treino aberto: a folha só oferece retomar (o banco aceita um por vez). */
  inProgress: InProgressWorkout | null;
  hasTrainedToday: boolean;
  onResume: (sessionId: string) => void;
  /** Inicia a rotina (null = treino vazio). */
  onStart: (routine: { id: string; name: string } | null) => void;
  /** Projeto sem rotinas: montar a primeira. */
  onCreateRoutine: (projectId: string | undefined) => void;
}

/**
 * Folha "Iniciar treino" (Claude Design "Iniciar Treino" · alternativa 2): 60% da tela com as rotinas do
 * projeto ativo, a próxima em destaque, troca de projeto e "Começar treino vazio" fixo embaixo.
 * Iniciar fecha a folha na hora (sem contagem). Quem abre decide o que iniciar e retomar.
 */
export function StartWorkoutSheet({ open, onClose, inProgress, hasTrainedToday, onResume, onStart, onCreateRoutine }: StartWorkoutSheetProps) {
  const sheet = useStartWorkoutSheet(open && !inProgress, hasTrainedToday);
  const isPickingProject = !inProgress && sheet.view === "projects";
  const title = inProgress ? "Treino em andamento" : isPickingProject ? "Escolher projeto" : "Iniciar treino";

  return (
    <BottomSheet
      placement="screen"
      open={open}
      onClose={onClose}
      title={title}
      header={<StartSheetHeader title={title} onBack={isPickingProject ? sheet.showRoutines : undefined} onClose={onClose} />}
      className={inProgress ? undefined : "h-[60dvh] grid-rows-[auto_minmax(0,1fr)]"}
    >
      {inProgress ? (
        <InProgressBody workout={inProgress} onResume={onResume} />
      ) : (
        <StartBody sheet={sheet} onStart={onStart} onCreateRoutine={onCreateRoutine} />
      )}
    </BottomSheet>
  );
}

function InProgressBody({ workout, onResume }: { workout: InProgressWorkout; onResume: (sessionId: string) => void }) {
  return (
    <>
      <p className="m-0 text-sm leading-5 text-fg-secondary">Finalize o treino aberto antes de começar outro.</p>
      <SheetOption icon={Play} title={workout.name} subtitle={`Retomar · ${startedAgoLabel(workout.startedAt)}`} highlighted onClick={() => onResume(workout.id)} />
    </>
  );
}

function StartBody({
  sheet,
  onStart,
  onCreateRoutine,
}: {
  sheet: StartWorkoutSheetState;
  onStart: StartWorkoutSheetProps["onStart"];
  onCreateRoutine: StartWorkoutSheetProps["onCreateRoutine"];
}) {
  if (sheet.view === "projects") {
    return (
      <div className="-mx-4 min-h-0 overflow-y-auto overscroll-contain px-4">
        <ProjectPickerList projects={sheet.projects} selectedId={sheet.project?.id ?? null} onChoose={sheet.chooseProject} />
      </div>
    );
  }
  return (
    <div className="flex min-h-0 animate-guf-from-left flex-col gap-2">
      {sheet.project && <ProjectSwitchButton name={sheet.project.name} isActive={sheet.project.isActive} onClick={sheet.showProjects} />}
      <div className="-mx-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-4 pt-1 pb-3 [mask-image:linear-gradient(to_bottom,transparent_0,#000_10px,#000_calc(100%-18px),transparent_100%)]">
        <RoutineList sheet={sheet} onStart={onStart} onCreateRoutine={onCreateRoutine} />
      </div>
      <button
        type="button"
        onClick={() => onStart(null)}
        className="flex min-h-12 w-full flex-none cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px] border-dashed border-border-strong bg-transparent text-[15px] font-semibold text-fg transition-colors duration-150 ease-standard hover:border-accent-text hover:bg-accent/6 active:scale-98"
      >
        <Icon icon={Plus} size={18} />
        Começar treino vazio
      </button>
    </div>
  );
}

function RoutineList({
  sheet,
  onStart,
  onCreateRoutine,
}: {
  sheet: StartWorkoutSheetState;
  onStart: StartWorkoutSheetProps["onStart"];
  onCreateRoutine: StartWorkoutSheetProps["onCreateRoutine"];
}) {
  if (sheet.status.isError) {
    return (
      <Banner tone="danger" actionLabel="Tentar" onAction={() => void sheet.status.refetch()}>
        {sheet.status.error.message}
      </Banner>
    );
  }
  if (sheet.status.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando rotinas" className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }
  const routines = sheet.project?.routines ?? [];
  if (routines.length === 0) {
    return <SheetOption icon={ListPlus} title="Montar uma rotina" subtitle="Crie o Treino A, B, C… deste projeto" onClick={() => onCreateRoutine(sheet.project?.id)} />;
  }
  return (
    <>
      <span className="px-0.5 pt-1 text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">{plural(routines.length, "treino", "treinos")}</span>
      {routines.map((routine, i) => (
        <StartRoutineCard
          key={routine.id}
          routine={routine}
          index={i}
          isNext={routine.id === sheet.nextId}
          isOpen={routine.id === sheet.expandedRoutineId}
          onToggle={() => sheet.toggleRoutine(routine.id)}
          onStart={() => onStart(routine)}
        />
      ))}
    </>
  );
}
