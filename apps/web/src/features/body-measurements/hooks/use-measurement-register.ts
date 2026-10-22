"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import {
  draftValues,
  hasDraftInput,
  hasInvalidDraftField,
  MEASUREMENT_PARTS,
  measurementDateLabel,
  latestMeasurementValues,
  savedMeasurementsLabel,
  saveMeasurementsLabel,
  toLocalISODate,
  undoMeasurementValues,
  type BodyMeasurementDay,
  type MeasurementDraft,
  type MeasurementPart,
  type MeasurementSite,
} from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { useSaveBodyMeasurement, useUndoBodyMeasurement } from "@/features/body-measurements/api/use-body-measurements";
import type { MeasurementDateMode } from "@/features/body-measurements/components/measurement-date-card";

interface MeasurementRegisterOptions {
  days: BodyMeasurementDay[];
  /** Músculo de onde a pessoa veio (só ele aparece até "Medir outros músculos"). */
  focus: MeasurementPart | null;
  canUse: boolean;
  /** Depois de salvar (a tela fecha; o aviso com "Desfazer" continua na pilha). */
  onSaved: () => void;
}

/** Estado da nova medição (protótipo 1f/1g): data, campos digitados, contagem e salvar com "Desfazer". */
export function useMeasurementRegister({ days, focus, canUse, onSaved }: MeasurementRegisterOptions) {
  const { showToast } = useAppShell();
  const save = useSaveBodyMeasurement();
  const undo = useUndoBodyMeasurement();
  const [today] = useState(() => new Date());
  const todayIso = toLocalISODate(today);
  const [mode, setMode] = useState<MeasurementDateMode>("today");
  const [otherDay, setOtherDay] = useState(todayIso);
  const [draft, setDraft] = useState<MeasurementDraft>({});
  const [showAll, setShowAll] = useState(focus === null);

  const measuredOn = mode === "today" ? todayIso : otherDay;
  const values = draftValues(draft);
  const count = Object.keys(values).length;
  const hasInvalid = hasInvalidDraftField(draft);

  const changeField = (site: MeasurementSite, text: string) => setDraft((current) => ({ ...current, [site]: text }));

  const undoSave = async (previousDay: BodyMeasurementDay | undefined, sites: MeasurementSite[], date: string) => {
    const error = await undo({ measuredOn: date, values: undoMeasurementValues(previousDay, sites) });
    if (error) showToast("Não foi possível desfazer", { tone: "error", message: error.message });
    else showToast("Medição desfeita", { tone: "info" });
  };

  const submit = () => {
    if (count === 0 || hasInvalid || !canUse) return;
    const previousDay = days.find((day) => day.measuredOn === measuredOn);
    const sites = Object.keys(values) as MeasurementSite[];
    const date = measuredOn;
    save.mutate(
      { measuredOn: date, values },
      {
        onSuccess: () => {
          showToast(savedMeasurementsLabel(sites.length, date, today), {
            tone: "undo",
            icon: CircleCheck,
            actionLabel: "Desfazer",
            onAction: () => void undoSave(previousDay, sites, date),
          });
          onSaved();
        },
        onError: (error) => showToast("Medição não salva", { tone: "error", message: error.message }),
      },
    );
  };

  return {
    today,
    mode,
    setMode,
    measuredOn,
    selectDay: setOtherDay,
    dateLabel: measurementDateLabel(measuredOn, today),
    hasConflict: days.some((day) => day.measuredOn === measuredOn),
    parts: showAll || !focus ? MEASUREMENT_PARTS : [focus],
    canShowAll: !showAll && focus !== null,
    showAll: () => setShowAll(true),
    draft,
    changeField,
    lastValues: latestMeasurementValues(days),
    hasInput: hasDraftInput(draft),
    canSave: count > 0 && !hasInvalid && canUse,
    saveLabel: saveMeasurementsLabel(count),
    isSaving: save.isPending,
    submit,
  };
}
