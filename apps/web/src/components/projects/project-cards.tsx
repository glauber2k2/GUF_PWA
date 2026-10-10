"use client";

import { useState, type ReactNode } from "react";
import { ArchiveRestore, CalendarCheck, Check, ChevronDown, ChevronRight, CircleDashed, Ellipsis, Star } from "lucide-react";
import { archivedLabel, projectMeta, routineLetter } from "@guf/core";
import type { Project, ProjectRoutine } from "@guf/api";
import { Button, Icon, IconButton } from "@/components/ds";
import { cn } from "@/lib/utils";

const OVERLINE = "text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase";

/** Selo "Ativo" (volt). */
export function ActiveBadge({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-6 flex-none items-center gap-1 rounded-pill bg-accent pr-2.5 pl-2 text-xs font-bold text-accent-foreground", className)}>
      <Icon icon={Check} size={13} />
      Ativo
    </span>
  );
}

/** Card do projeto ativo: letras das rotinas (a sugerida em volt) e a rotina do dia. */
export function ActiveProjectCard({
  project,
  nextRoutine,
  nextLabel,
  disabled,
  onOpen,
  onMenu,
}: {
  project: Project;
  /** Rotina sugerida pela Início (próxima depois da última concluída). */
  nextRoutine: ProjectRoutine | null;
  /** "Hoje" ou "Próximo" (já treinou hoje). */
  nextLabel: string;
  disabled: boolean;
  onOpen: () => void;
  onMenu: () => void;
}) {
  return (
    <article
      aria-label={`Projeto ativo: ${project.name}`}
      className="flex flex-none animate-guf-rise flex-col gap-3 rounded-lg border-[1.5px] border-accent-text bg-active-surface pt-3.5 pr-2 pb-4 pl-4"
    >
      <div className="flex items-center justify-between gap-2">
        <ActiveBadge />
        <IconButton icon={Ellipsis} variant="ghost" label={`Opções de ${project.name}`} disabled={disabled} onClick={onMenu} />
      </div>
      <div className="-mt-2 flex flex-col gap-1 pr-2">
        <h2 className="m-0 flex items-center gap-1.5 text-[21px] leading-[26px] font-semibold tracking-[-0.015em] text-pretty">
          {project.isFavorites && <Icon icon={Star} size={18} className="text-accent-text" label="Projeto padrão" />}
          {project.name}
        </h2>
        {project.description && <span className="text-sm leading-5 text-pretty text-fg-secondary">{project.description}</span>}
      </div>
      {project.routines.length > 0 && (
        <>
          <div className="flex gap-1.5 pr-2" aria-hidden="true">
            {project.routines.map((r) => (
              <span
                key={r.id}
                className={cn(
                  "grid h-9 flex-1 place-items-center rounded-sm font-display text-lg font-bold",
                  r.id === nextRoutine?.id ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg",
                )}
              >
                {routineLetter(r.name)}
              </span>
            ))}
          </div>
          {nextRoutine && (
            <div className="mr-2 flex items-center gap-2.5 rounded-md bg-surface-3 px-3 py-2.5">
              <Icon icon={CalendarCheck} size={18} className="text-accent-text" />
              <span className="min-w-0 flex-1 text-sm leading-5">
                <strong className="font-semibold">{nextLabel}:</strong> {nextRoutine.name}
              </span>
            </div>
          )}
        </>
      )}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[13px] text-fg-muted tabular-nums">{projectMeta(project.routines.length)}</span>
        <Button variant="ghost" iconRight={ChevronRight} onClick={onOpen}>
          Ver rotinas
        </Button>
      </div>
    </article>
  );
}

/** Sem projeto ativo (há projetos): convite para ativar um. */
export function NoActiveProjectCard() {
  return (
    <div className="flex flex-none animate-guf-rise items-start gap-3.5 rounded-lg border border-dashed border-border-strong p-4">
      <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
        <Icon icon={CircleDashed} size={22} />
      </span>
      <div className="flex flex-col gap-1">
        <strong className="text-base leading-[22px] font-semibold">Nenhum projeto ativo</strong>
        <span className="text-sm leading-5 text-pretty text-fg-secondary">Ative um projeto para a Início sugerir seu treino do dia.</span>
      </div>
    </div>
  );
}

/** Projeto em uso (não ativo): abrir, ativar e menu. */
export function ProjectListItem({
  project,
  index,
  disabled,
  onOpen,
  onActivate,
  onMenu,
}: {
  project: Project;
  index: number;
  disabled: boolean;
  onOpen: () => void;
  onActivate: () => void;
  onMenu: () => void;
}) {
  return (
    <article
      aria-label={project.name}
      style={{ animationDelay: `${60 + index * 50}ms` }}
      className="flex flex-none animate-guf-rise items-center gap-1 rounded-lg border border-border bg-surface py-1.5 pr-1.5"
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-2 rounded-[14px] bg-transparent py-2.5 pr-2 pl-4 text-left text-fg"
      >
        <span className="flex min-w-0 items-center gap-1.5 text-base leading-[22px] font-semibold">
          {project.isFavorites && <Icon icon={Star} size={16} className="flex-none text-accent-text" label="Projeto padrão" />}
          <span className="truncate">{project.name}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {project.routines.slice(0, 6).map((r) => (
            <span
              key={r.id}
              aria-hidden="true"
              className="grid size-[26px] place-items-center rounded-[7px] bg-surface-3 font-display text-[15px] font-bold text-fg-secondary"
            >
              {routineLetter(r.name)}
            </span>
          ))}
          <span className="text-[13px] whitespace-nowrap text-fg-muted tabular-nums">{projectMeta(project.routines.length)}</span>
        </span>
      </button>
      <Button variant="secondary" disabled={disabled} onClick={onActivate}>
        Ativar
      </Button>
      <IconButton icon={Ellipsis} variant="ghost" label={`Opções de ${project.name}`} disabled={disabled} onClick={onMenu} />
    </article>
  );
}

/** Seção recolhível "Arquivados (N)" com "Restaurar". */
export function ArchivedProjects({
  projects,
  disabled,
  defaultOpen = false,
  onRestore,
}: {
  projects: Project[];
  disabled: boolean;
  defaultOpen?: boolean;
  onRestore: (project: Project) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="mt-3 flex h-11 flex-none cursor-pointer items-center justify-between rounded-[10px] bg-transparent px-1 text-fg-secondary"
      >
        <span className={cn(OVERLINE, "text-fg-secondary")}>Arquivados ({projects.length})</span>
        <Icon icon={ChevronDown} size={18} className={cn("transition-transform duration-200 ease-standard", open && "rotate-180")} />
      </button>
      {open && (
        <>
          {projects.map((p) => (
            <article
              key={p.id}
              aria-label={`${p.name}, arquivado`}
              className="flex flex-none animate-guf-rise-fast items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pr-1.5 pl-4"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 opacity-72">
                <span className="truncate text-[15px] leading-5 font-medium text-fg-secondary">{p.name}</span>
                <span className="text-xs leading-4 text-fg-muted tabular-nums">
                  {projectMeta(p.routines.length)} · {archivedLabel(p.archivedAt ?? p.createdAt)}
                </span>
              </span>
              <Button variant="ghost" icon={ArchiveRestore} disabled={disabled} onClick={() => onRestore(p)}>
                Restaurar
              </Button>
            </article>
          ))}
          <span className="px-1 text-xs leading-4 text-pretty text-fg-muted">Treinos feitos com projetos arquivados continuam no histórico.</span>
        </>
      )}
    </>
  );
}

/** Título de seção em caixa alta ("Outros projetos", "Rotinas"). */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(OVERLINE, "flex-none", className)}>{children}</span>;
}
