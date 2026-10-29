import { ChevronsUpDown, FolderOpen } from "lucide-react";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

/** Projeto em exibição na folha e o atalho "Trocar" (escolher outro projeto não o ativa). */
export function ProjectSwitchButton({ name, isActive, onClick }: { name: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Projeto ${name}. Trocar projeto`}
      className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 rounded-md border border-border-strong bg-surface-3 py-2 pr-3 pl-2 text-left text-fg transition-colors duration-150 ease-standard hover:bg-surface active:scale-98"
    >
      <span className={cn("grid size-8 flex-none place-items-center rounded-[8px]", isActive ? "bg-accent text-accent-foreground" : "bg-surface-elevated text-fg-secondary")}>
        <Icon icon={FolderOpen} size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] leading-[14px] font-semibold tracking-[0.06em] text-fg-muted uppercase">{isActive ? "Projeto ativo" : "Vendo outro projeto"}</span>
        <strong className="truncate text-sm leading-[18px] font-semibold">{name}</strong>
      </span>
      <span className="flex flex-none items-center gap-1 text-[13px] font-semibold text-accent-text">
        Trocar
        <Icon icon={ChevronsUpDown} size={16} />
      </span>
    </button>
  );
}
