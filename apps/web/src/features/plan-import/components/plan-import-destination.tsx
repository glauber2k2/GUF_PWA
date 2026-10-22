import { ClipboardList, Star } from "lucide-react";
import type { PlanImportDestination, Project } from "@guf/api";
import { plural } from "@guf/core";
import { SegmentedControl, SheetOption, Switch, TextField } from "@/shared/components/ds";

const DESTINATION_OPTIONS = [
  { value: "new", label: "Projeto novo" },
  { value: "existing", label: "Projeto existente" },
];

interface PlanImportDestinationPickerProps {
  projects: readonly Project[];
  destination: PlanImportDestination;
  projectName: string;
  disabled: boolean;
  onDestination: (destination: PlanImportDestination) => void;
  onProjectName: (name: string) => void;
}

/** Onde as rotinas entram: projeto novo (nome editável, ativo ou não) ou um projeto que já existe. */
export function PlanImportDestinationPicker({ projects, destination, projectName, disabled, onDestination, onProjectName }: PlanImportDestinationPickerProps) {
  const selectKind = (kind: string) => {
    if (kind === "new") return onDestination({ kind: "new", activate: true });
    const first = projects[0];
    if (first) onDestination({ kind: "existing", projectId: first.id });
  };

  return (
    <section aria-label="Onde criar" className="flex flex-col gap-3">
      <h2 className="m-0 text-sm leading-5 font-semibold text-fg-secondary">Onde criar</h2>
      <SegmentedControl options={DESTINATION_OPTIONS} value={destination.kind} onChange={selectKind} label="Onde criar as rotinas" />
      {destination.kind === "new" ? (
        <div className="flex flex-col gap-3">
          <TextField
            label="Nome do projeto"
            value={projectName}
            error={projectName.trim() ? undefined : "Dê um nome para o projeto."}
            disabled={disabled}
            onChange={(event) => onProjectName(event.target.value)}
          />
          <Switch
            label="Usar como projeto ativo"
            checked={destination.activate}
            disabled={disabled}
            onChange={(activate) => onDestination({ kind: "new", activate })}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <SheetOption
              key={project.id}
              icon={project.isFavorites ? Star : ClipboardList}
              title={project.name}
              subtitle={plural(project.routines.length, "rotina", "rotinas")}
              highlighted={project.id === destination.projectId}
              disabled={disabled}
              onClick={() => onDestination({ kind: "existing", projectId: project.id })}
            />
          ))}
        </div>
      )}
    </section>
  );
}
