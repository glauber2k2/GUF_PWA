"use client";

import { ChevronRight, ClipboardList } from "lucide-react";
import { plural, routineLetter } from "@guf/core";
import type { MemberActiveProject } from "@guf/api";
import { Icon } from "@/shared/components/ds";

/** Letras de rotina mostradas na linha (o resto aparece no painel). */
const MAX_ROUTINE_LETTERS = 6;

export interface ActiveProjectRowProps {
  project: MemberActiveProject;
  onOpen: () => void;
}

/** Linha discreta "Projeto ativo" do perfil (Claude Design "Perfil - Projeto Ativo" · 2c); tocar abre o painel. */
export function ActiveProjectRow({ project, onOpen }: ActiveProjectRowProps) {
  const letters = project.routines.slice(0, MAX_ROUTINE_LETTERS);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex animate-guf-rise cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface py-3 pr-2 pl-3.5 text-left text-fg transition-[background-color,transform] duration-150 ease-standard hover:bg-surface-elevated active:scale-[.98] motion-reduce:transition-none"
    >
      <span className="grid size-11 flex-none place-items-center rounded-md bg-accent/14 text-accent-text">
        <Icon icon={ClipboardList} size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-[11px] leading-[14px] font-semibold tracking-[0.08em] text-fg-muted uppercase">Projeto ativo</span>
        <span className="truncate text-base leading-5 font-semibold">{project.name}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          {letters.map((routine) => (
            <span
              key={routine.id}
              aria-hidden="true"
              className="grid size-[22px] flex-none place-items-center rounded-[6px] bg-surface-3 font-display text-[13px] font-bold text-fg-secondary"
            >
              {routineLetter(routine.name)}
            </span>
          ))}
          <span className="truncate text-xs text-fg-muted">{plural(project.routines.length, "rotina", "rotinas")}</span>
        </span>
      </span>
      <Icon icon={ChevronRight} size={20} className="flex-none text-fg-muted" />
    </button>
  );
}
