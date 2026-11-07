"use client";

import Link from "next/link";
import { Copy, Eye, EyeOff } from "lucide-react";
import { activeProjectVisibilityNote, formatPlannedSets, nextRoutineId, routineLetter, routineScheduleMeta } from "@guf/core";
import type { MemberActiveProject, RoutineSummary } from "@guf/api";
import { BottomSheet, Button, Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { PRIVACY_SETTINGS_PATH } from "@/features/profile";

/** Atraso entre os cards ao abrir o painel (entrada escalonada). */
const CARD_STAGGER_MS = 50;

export interface ActiveProjectSheetProps {
  project: MemberActiveProject;
  handle: string;
  /** O seu perfil: no lugar de ações, o aviso de quem vê o projeto. */
  isSelf: boolean;
  historyHidden: boolean;
  open: boolean;
  onClose: () => void;
  /** Perfil de outra pessoa: copiar uma rotina ou o projeto inteiro. */
  copyActions?: ActiveProjectCopyActions;
}

export interface ActiveProjectCopyActions {
  /** Sem internet, os botões ficam desligados (editar projetos é só online). */
  canCopy: boolean;
  onCopyRoutine: (routine: RoutineSummary) => void;
  onCopyProject: () => void;
}

/**
 * Painel do projeto ativo (2c): descrição e as rotinas lado a lado, com dias, tempo médio e
 * exercícios (séries × repetições). A próxima rotina, pela regra da Início, fica em destaque.
 * De outra pessoa: "Copiar rotina" em cada card e "Copiar projeto inteiro".
 */
export function ActiveProjectSheet({ project, handle, isSelf, historyHidden, open, onClose, copyActions }: ActiveProjectSheetProps) {
  const nextId = nextRoutineId(project.routines, project.lastRoutineId, new Date(), false);
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title={project.name} subtitle={`@${handle}`}>
      <div className="flex min-w-0 flex-col gap-3.5">
        {project.description && <p className="m-0 text-sm leading-5 text-pretty text-fg-secondary">{project.description}</p>}
        {project.routines.length === 0 ? (
          <p className="m-0 text-sm text-fg-secondary">Este projeto ainda não tem rotinas.</p>
        ) : (
          <ul
            aria-label="Rotinas do projeto"
            className="-mx-4 my-0 flex min-w-0 snap-x snap-mandatory scroll-px-4 list-none gap-2.5 overflow-x-auto px-4 pt-0.5 pb-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {project.routines.map((routine, index) => (
              <ProjectRoutineCard key={routine.id} routine={routine} isNext={routine.id === nextId} index={index} copyActions={copyActions} />
            ))}
          </ul>
        )}
        {copyActions && project.routines.length > 0 && (
          <>
            <Button variant="primary" size="lg" fullWidth icon={Copy} disabled={!copyActions.canCopy} onClick={copyActions.onCopyProject}>
              Copiar projeto inteiro
            </Button>
            {!copyActions.canCopy && (
              <p className="m-0 text-center text-[13px] leading-[18px] text-fg-muted">Sem conexão – para copiar, conecte-se à internet.</p>
            )}
          </>
        )}
        {isSelf && <VisibilityNote historyHidden={historyHidden} />}
      </div>
    </BottomSheet>
  );
}

function ProjectRoutineCard({
  routine,
  isNext,
  index,
  copyActions,
}: {
  routine: RoutineSummary;
  isNext: boolean;
  index: number;
  copyActions?: ActiveProjectCopyActions;
}) {
  return (
    <li
      className="flex w-[272px] flex-none animate-guf-rise-fast snap-start flex-col overflow-hidden rounded-lg border border-border bg-surface"
      // Entrada escalonada (valor dinâmico).
      style={{ animationDelay: `${index * CARD_STAGGER_MS}ms` }}
    >
      <div className="flex items-center gap-3 px-3.5 pt-3.5 pb-2.5">
        <span
          className={cn(
            "grid size-10 flex-none place-items-center rounded-md font-display text-xl font-bold",
            isNext ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg",
          )}
        >
          {routineLetter(routine.name)}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <strong className="truncate text-[15px] leading-5 font-semibold">
            {isNext && <span className="sr-only">Próximo treino: </span>}
            {routine.name}
          </strong>
          <span className="truncate text-xs leading-4 text-fg-muted tabular-nums">
            {routineScheduleMeta(routine.weekdays, routine.exercises, routine.averageDurationSeconds)}
          </span>
        </span>
      </div>
      <ul aria-label={`Exercícios de ${routine.name}`} className="m-0 list-none p-0">
        {routine.exercises.map((exercise, position) => (
          <li key={position} className="flex items-center justify-between gap-2.5 border-t border-border px-3.5 py-[7px]">
            <span className="min-w-0 truncate text-[13px] leading-[18px]">{exercise.name}</span>
            <span className="flex-none font-display text-[15px] font-semibold text-fg-secondary tabular-nums">
              {formatPlannedSets(exercise.targetSets, exercise.targetReps)}
            </span>
          </li>
        ))}
      </ul>
      {copyActions && (
        <div className="mt-auto px-3.5 pt-2.5 pb-3.5">
          <Button variant="secondary" fullWidth icon={Copy} disabled={!copyActions.canCopy} onClick={() => copyActions.onCopyRoutine(routine)}>
            Copiar rotina
          </Button>
        </div>
      )}
    </li>
  );
}

function VisibilityNote({ historyHidden }: { historyHidden: boolean }) {
  return (
    <p className="m-0 flex items-start gap-1.5 text-[13px] leading-[18px] text-pretty text-fg-muted">
      <Icon icon={historyHidden ? EyeOff : Eye} size={14} className="mt-0.5 flex-none" />
      <span>
        {activeProjectVisibilityNote(historyHidden)}{" "}
        <Link href={PRIVACY_SETTINGS_PATH} className="font-medium text-accent-text">
          Ajustar em Privacidade
        </Link>
      </span>
    </p>
  );
}
