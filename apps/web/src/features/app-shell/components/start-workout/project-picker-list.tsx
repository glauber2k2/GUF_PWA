import { Folder } from "lucide-react";
import { plural } from "@guf/core";
import type { Project } from "@guf/api";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Escolher de qual projeto ver as rotinas (protótipo 2c): rádio por projeto, "Ativo" no projeto ativo. */
export function ProjectPickerList({ projects, selectedId, onChoose }: { projects: readonly Project[]; selectedId: string | null; onChoose: (projectId: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Projetos" className="flex animate-guf-from-right flex-col gap-2 pb-2">
      {projects.map((project, i) => {
        const isSelected = project.id === selectedId;
        return (
          <button
            key={project.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChoose(project.id)}
            className={cn(
              "flex min-h-[68px] flex-none animate-guf-rise-fast cursor-pointer items-center gap-3 rounded-[14px] p-3 text-left text-fg active:scale-98",
              isSelected ? "border-[1.5px] border-accent-text bg-accent/8" : "border border-border bg-surface",
            )}
            // Entrada escalonada (valor dinâmico).
            style={{ animationDelay: `${40 + i * 50}ms` }}
          >
            <span className={cn("grid size-10 flex-none place-items-center rounded-md", isSelected ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg-secondary")}>
              <Icon icon={Folder} size={18} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-2">
                <strong className="truncate text-[15px] leading-5 font-semibold">{project.name}</strong>
                {project.isActive && (
                  <span className="flex h-5 flex-none items-center rounded-[6px] bg-accent/16 px-1.5 text-[11px] font-semibold text-accent-text">Ativo</span>
                )}
              </span>
              <span className="text-[13px] leading-[18px] text-fg-secondary">{plural(project.routines.length, "treino", "treinos")}</span>
            </span>
            <span className={cn("grid size-[22px] flex-none place-items-center rounded-pill border-2", isSelected ? "border-accent" : "border-border-strong")}>
              <span className={cn("size-2.5 rounded-pill bg-accent transition-transform duration-250 ease-overshoot", isSelected ? "scale-100" : "scale-0")} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
