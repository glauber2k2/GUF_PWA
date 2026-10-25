"use client";

import type { CatalogExercise } from "@guf/api/admin";
import { equipmentLabel, formatStaffDateTime, muscleGroupLabel } from "@guf/core";
import { Tag } from "@guf/ui";
import { useDevice } from "@/shared/hooks/use-device";

const HEAD_CELL = "border-b border-border px-4 text-left font-semibold";

/** Exercícios do catálogo: cartões no celular, tabela no tablet e no computador. */
export function CatalogExerciseList({ exercises }: { exercises: CatalogExercise[] }) {
  const device = useDevice();

  if (device === "mobile") {
    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {exercises.map((exercise) => (
          <li key={exercise.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3.5">
            <strong className="break-words">{exercise.name}</strong>
            <span className="flex flex-wrap gap-1.5">
              <Tag size="sm">{muscleGroupLabel(exercise.muscleGroup)}</Tag>
              <Tag size="sm" tone="muted">
                {equipmentLabel(exercise.equipment)}
              </Tag>
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-surface-elevated text-overline tracking-[.08em] text-fg-muted uppercase">
            <th scope="col" className={`h-11 ${HEAD_CELL}`}>
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
          </tr>
        </thead>
        <tbody>
          {exercises.map((exercise) => (
            <tr key={exercise.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-3 font-semibold">{exercise.name}</td>
              <td className="px-4 py-3 whitespace-nowrap text-fg-secondary">{muscleGroupLabel(exercise.muscleGroup)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-fg-secondary">{equipmentLabel(exercise.equipment)}</td>
              {device === "desktop" && <td className="px-4 py-3 whitespace-nowrap text-fg-secondary tabular-nums">{formatStaffDateTime(exercise.createdAt)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
