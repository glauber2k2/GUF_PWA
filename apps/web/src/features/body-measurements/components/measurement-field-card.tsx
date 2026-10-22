"use client";

import { CircleCheck } from "lucide-react";
import {
  formatCentimeters,
  isInvalidDraftField,
  parseCentimeters,
  type BodyMeasurementDay,
  type MeasurementDraft,
  type MeasurementPart,
  type MeasurementSite,
} from "@guf/core";
import { Icon, MuscleIcon, TextField } from "@/shared/components/ds";

interface MeasurementFieldCardProps {
  part: MeasurementPart;
  draft: MeasurementDraft;
  /** Último valor de cada local (referência no campo). */
  lastValues: BodyMeasurementDay["values"];
  disabled: boolean;
  onChange: (site: MeasurementSite, text: string) => void;
}

const INVALID_MESSAGE = "Use cm, ex.: 38,5";

/** Campos de um músculo na nova medição: Esquerdo/Direito ou Circunferência, com a última medida como referência. */
export function MeasurementFieldCard({ part, draft, lastValues, disabled, onChange }: MeasurementFieldCardProps) {
  const fields =
    part.sites.kind === "bilateral"
      ? [
          { site: part.sites.left, label: "Esquerdo" },
          { site: part.sites.right, label: "Direito" },
        ]
      : [{ site: part.sites.site, label: "Circunferência" }];
  const isFilled = fields.some((field) => parseCentimeters(draft[field.site] ?? "") !== null);

  return (
    <section aria-label={part.name} className="flex flex-col gap-3 rounded-lg border border-border bg-surface px-4 pt-3.5 pb-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 flex-none place-items-center overflow-hidden rounded-[12px] bg-surface-3">
          <MuscleIcon muscle={part.key} zoom size={42} animate="none" label="" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-px">
          <strong className="text-[15px] leading-5 font-semibold">{part.name}</strong>
          <span className="text-xs leading-4 text-pretty text-fg-muted">{part.tip}</span>
        </span>
        {isFilled && <Icon icon={CircleCheck} size={20} label="Preenchido" className="flex-none text-accent-text" />}
      </div>
      <div className={fields.length > 1 ? "grid grid-cols-2 gap-2.5" : "grid"}>
        {fields.map((field) => {
          const last = lastValues[field.site];
          const text = draft[field.site];
          return (
            <TextField
              key={field.site}
              label={field.label}
              inputMode="decimal"
              autoComplete="off"
              value={text ?? ""}
              placeholder={last === undefined ? "cm" : formatCentimeters(last)}
              hint={last === undefined ? undefined : `Última: ${formatCentimeters(last)}`}
              error={isInvalidDraftField(text) ? INVALID_MESSAGE : undefined}
              disabled={disabled}
              onChange={(e) => onChange(field.site, e.target.value)}
            />
          );
        })}
      </div>
    </section>
  );
}
