"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { routineLetter } from "@guf/core";
import type { MemberActiveProject } from "@guf/api";
import { BottomSheet, Button, Switch } from "@/shared/components/ds";

export interface CopyProjectSheetProps {
  project: MemberActiveProject;
  handle: string;
  open: boolean;
  isCopying: boolean;
  onCopy: (activate: boolean) => void;
  onClose: () => void;
}

function countLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

/** "Copiar projeto": o que vem junto, a opção de ativar e a confirmação. */
export function CopyProjectSheet({ project, handle, open, isCopying, onCopy, onClose }: CopyProjectSheetProps) {
  const [shouldActivate, setShouldActivate] = useState(true);
  const exerciseCount = project.routines.reduce((total, routine) => total + routine.exercises.length, 0);
  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Copiar projeto" subtitle={`@${handle}`}>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3.5">
          <div className="flex flex-col gap-0.5">
            <strong className="text-base leading-[22px]">{project.name}</strong>
            <span className="text-[13px] leading-[18px] text-fg-muted tabular-nums">
              {countLabel(project.routines.length, "rotina", "rotinas")} · {countLabel(exerciseCount, "exercício", "exercícios")}
            </span>
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {project.routines.map((routine) => (
              <li key={routine.id} className="flex items-center gap-2.5">
                <span className="grid size-[26px] flex-none place-items-center rounded-[7px] bg-surface-3 font-display text-[15px] font-bold text-fg-secondary">
                  {routineLetter(routine.name)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{routine.name}</span>
                <span className="text-xs text-fg-muted tabular-nums">{countLabel(routine.exercises.length, "exercício", "exercícios")}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface px-3.5 pt-1.5 pb-3">
          <Switch label="Ativar depois de copiar" checked={shouldActivate} onChange={setShouldActivate} />
          <span className="text-[13px] leading-[18px] text-pretty text-fg-muted">
            {shouldActivate
              ? "A Início passa a sugerir os treinos deste projeto. O seu atual continua em Projetos."
              : "O projeto entra em Projetos sem mudar o seu projeto ativo."}
          </span>
        </div>
        <p className="m-0 text-xs leading-4 text-pretty text-fg-muted">
          Séries, repetições, descanso e dias vêm junto. As cargas e as observações não: o treino começa com as suas.
        </p>
        <Button variant="primary" size="lg" fullWidth icon={Copy} loading={isCopying} onClick={() => onCopy(shouldActivate)}>
          Copiar projeto
        </Button>
      </div>
    </BottomSheet>
  );
}
