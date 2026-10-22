"use client";

import { useState } from "react";
import { CircleCheck } from "lucide-react";
import {
  draftValues,
  editedMeasurementValues,
  hasDraftInput,
  hasInvalidDraftField,
  hasMeasurementChanges,
  MEASUREMENT_PARTS,
  measurementDateLabel,
  latestMeasurementValues,
  savedMeasurementsLabel,
  saveMeasurementsLabel,
  toLocalISODate,
  toMeasurementDraft,
  undoMeasurementValues,
  type BodyMeasurementDay,
  type MeasurementDraft,
  type MeasurementPart,
  type MeasurementSite,
} from "@guf/core";
import { useAppShell } from "@/features/app-shell";
import { useSaveBodyMeasurement, useUndoBodyMeasurement } from "@/features/body-measurements/api/use-body-measurements";
import type { MeasurementDateMode } from "@/features/body-measurements/components/measurement-date-card";

/** Registro que está sendo editado: a data fica travada e os campos começam com os valores dele. */
export interface MeasurementEdit {
  measuredOn: string;
  original: Partial<Record<MeasurementSite, number>>;
}

interface MeasurementRegisterOptions {
  days: BodyMeasurementDay[];
  /** Músculo de onde a pessoa veio (só ele aparece até "Medir outros músculos"). */
  focus: MeasurementPart | null;
  /** Editar um registro (menu do registro › Editar); null = nova medição. */
  edit: MeasurementEdit | null;
  canUse: boolean;
  /** Depois de salvar (a tela fecha; o aviso com "Desfazer" continua na pilha). */
  onSaved: () => void;
}

/**
 * Estado da nova medição (protótipo 1f/1g) ou da edição de um registro: data, campos digitados,
 * contagem e salvar com "Desfazer". Na edição, apagar um campo apaga o valor do registro.
 */
export function useMeasurementRegister({ days, focus, edit, canUse, onSaved }: MeasurementRegisterOptions) {
  const { showToast } = useAppShell();
  const save = useSaveBodyMeasurement();
  const undo = useUndoBodyMeasurement();
  const [today] = useState(() => new Date());
  const todayIso = toLocalISODate(today);
  const [mode, setMode] = useState<MeasurementDateMode>("today");
  const [otherDay, setOtherDay] = useState(todayIso);
  const [draft, setDraft] = useState<MeasurementDraft>(() => (edit ? toMeasurementDraft(edit.original) : {}));
  const [showAll, setShowAll] = useState(focus === null);

  const measuredOn = edit?.measuredOn ?? (mode === "today" ? todayIso : otherDay);
  const values = edit ? editedMeasurementValues(draft, edit.original) : draftValues(draft);
  const count = Object.values(values).filter((value) => value !== null).length;
  const hasInvalid = hasInvalidDraftField(draft);
  const hasChanges = edit ? hasMeasurementChanges(draft, edit.original) : count > 0;

  const changeField = (site: MeasurementSite, text: string) => setDraft((current) => ({ ...current, [site]: text }));

  const undoSave = async (previousDay: BodyMeasurementDay | undefined, sites: MeasurementSite[], date: string) => {
    const error = await undo({ measuredOn: date, values: undoMeasurementValues(previousDay, sites) });
    if (error) showToast("Não foi possível desfazer", { tone: "error", message: error.message });
    else showToast(edit ? "Edição desfeita" : "Medição desfeita", { tone: "info" });
  };

  const submit = () => {
    if (!hasChanges || hasInvalid || !canUse) return;
    const previousDay = days.find((day) => day.measuredOn === measuredOn);
    const sites = Object.keys(values) as MeasurementSite[];
    const date = measuredOn;
    save.mutate(
      { measuredOn: date, values },
      {
        onSuccess: () => {
          showToast(edit ? "Registro atualizado" : savedMeasurementsLabel(count, date, today), {
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
    hasConflict: !edit && days.some((day) => day.measuredOn === measuredOn),
    parts: showAll || !focus ? MEASUREMENT_PARTS : [focus],
    canShowAll: !showAll && focus !== null && !edit,
    showAll: () => setShowAll(true),
    draft,
    changeField,
    lastValues: latestMeasurementValues(days),
    hasInput: edit ? hasChanges : hasDraftInput(draft),
    canSave: hasChanges && !hasInvalid && canUse,
    saveLabel: edit ? "Salvar alterações" : saveMeasurementsLabel(count),
    isSaving: save.isPending,
    submit,
  };
}
