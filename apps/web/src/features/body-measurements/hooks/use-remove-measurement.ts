"use client";

import { Trash2 } from "lucide-react";
import { formatShortDate, fromLocalISODate, partDayValues, type BodyMeasurementDay, type MeasurementPart } from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { useRemoveMeasurementRecord, useUndoBodyMeasurement } from "@/features/body-measurements/api/use-body-measurements";

/**
 * Excluir o registro do músculo num dia (menu do registro, depois da confirmação), com "Desfazer"
 * no aviso, que grava de volta os valores que o dia tinha.
 */
export function useRemoveMeasurement(part: MeasurementPart, days: BodyMeasurementDay[]): (measuredOn: string) => void {
  const { showToast } = useAppShell();
  const remove = useRemoveMeasurementRecord();
  const restore = useUndoBodyMeasurement();

  return (measuredOn) => {
    const previous = partDayValues(
      days.find((day) => day.measuredOn === measuredOn),
      part,
    );
    const message = `${part.name} · ${formatShortDate(fromLocalISODate(measuredOn))}`;
    remove.mutate(
      { measuredOn, part },
      {
        onSuccess: () =>
          showToast("Registro removido", {
            tone: "undo",
            icon: Trash2,
            message,
            actionLabel: "Desfazer",
            onAction: () =>
              void restore({ measuredOn, values: previous }).then((error) => {
                if (error) showToast("Não foi possível desfazer", { tone: "error", message: error.message });
              }),
          }),
        onError: (error) => showToast("Registro não removido", { tone: "error", message: error.message }),
      },
    );
  };
}
