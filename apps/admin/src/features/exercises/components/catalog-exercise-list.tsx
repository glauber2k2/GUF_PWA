"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { CatalogExercise } from "@guf/api/admin";
import { equipmentLabel, formatStaffDateTime, muscleGroupLabel } from "@guf/core";
import { Tag } from "@guf/ui";
import { catalogRowProps } from "@/features/exercises/hooks/use-catalog-shortcuts";
import { ActionMenu } from "@/shared/components/action-menu";
import { LIST_ITEM_FOCUS } from "@/shared/helpers/list-navigation";
import { useDevice } from "@/shared/hooks/use-device";

const HEAD_CELL = "border-b border-border px-4 text-left font-semibold";

interface CatalogExerciseListProps {
  exercises: CatalogExercise[];
  /** Sem estas ações (papel sem permissão), a lista é só de leitura: sem menu e sem foco nas linhas. */
  actions?: { onEdit: (exercise: CatalogExercise) => void; onDelete: (exercise: CatalogExercise) => void };
}

function ExerciseMenu({ exercise, actions }: { exercise: CatalogExercise; actions: NonNullable<CatalogExerciseListProps["actions"]> }) {
  return (
    <ActionMenu
      label={`Ações para ${exercise.name}`}
      items={[
        { key: "edit", label: "Editar", icon: Pencil, onSelect: () => actions.onEdit(exercise) },
        { key: "delete", label: "Excluir", icon: Trash2, onSelect: () => actions.onDelete(exercise), isDanger: true },
      ]}
    />
  );
}

/** Exercícios do catálogo: cartões no celular, tabela no tablet e no computador; três pontinhos por linha. */
export function CatalogExerciseList({ exercises, actions }: CatalogExerciseListProps) {
  const device = useDevice();
  const rowProps = (exercise: CatalogExercise) => (actions ? { ...catalogRowProps(exercise.id), "aria-label": exercise.name } : {});

  if (device === "mobile") {
    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {exercises.map((exercise) => (
          <li key={exercise.id} className="flex items-start gap-2 rounded-lg border border-border bg-surface py-3.5 pr-2 pl-4">
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <strong className="break-words">{exercise.name}</strong>
              <span className="flex flex-wrap gap-1.5">
                <Tag size="sm">{muscleGroupLabel(exercise.muscleGroup)}</Tag>
                <Tag size="sm" tone="muted">
                  {equipmentLabel(exercise.equipment)}
                </Tag>
              </span>
            </span>
            {actions && <ExerciseMenu exercise={exercise} actions={actions} />}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-elevated text-overline tracking-[.08em] text-fg-muted uppercase">
            <th scope="col" className={`h-11 rounded-tl-lg ${HEAD_CELL}`}>
              Exercício
            </th>
            <th scope="col" className={HEAD_CELL}>
              Grupo muscular
            </th>
            <th scope="col" className={HEAD_CELL}>
              Equipamento
            </th>
            {device === "desktop" && (
              <th scope="col" className={HEAD_CELL}>
                Cadastrado em
              </th>
            )}
            {actions && (
              <th scope="col" className={`w-15 rounded-tr-lg ${HEAD_CELL}`}>
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => (
            <tr key={exercise.id} {...rowProps(exercise)} className={`border-b border-border last:border-b-0 ${LIST_ITEM_FOCUS}`}>
              <td className="px-4 py-3 font-semibold">{exercise.name}</td>
              <td className="px-4 py-3 whitespace-nowrap text-fg-secondary">{muscleGroupLabel(exercise.muscleGroup)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-fg-secondary">{equipmentLabel(exercise.equipment)}</td>
              {device === "desktop" && <td className="px-4 py-3 whitespace-nowrap text-fg-secondary tabular-nums">{formatStaffDateTime(exercise.createdAt)}</td>}
              {actions && (
                <td className="px-2 py-1">
                  <ExerciseMenu exercise={exercise} actions={actions} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
