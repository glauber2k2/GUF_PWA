"use client";

import { CircleAlert } from "lucide-react";
import { CHANGE_REASONS, REASON_NOTE_LIMITS, type ChangeReason } from "@guf/core";
import { Icon, TextAreaField } from "@guf/ui";
import { ChoiceCard } from "@/shared/components/choice-card";

interface ReasonFieldsProps {
  reason: ChangeReason | null;
  note: string;
  onReason: (reason: ChangeReason) => void;
  onNote: (note: string) => void;
  showError: boolean;
  /** Motivos aceitos nesta ação (desvincular login: só pedido da pessoa). */
  options?: ChangeReason[];
}

/** Motivo obrigatório (fica na auditoria). Em "Outro", descrever sem dados pessoais. */
export function ReasonFields({ reason, note, onReason, onNote, showError, options }: ReasonFieldsProps) {
  const reasons = options ?? (Object.keys(CHANGE_REASONS) as ChangeReason[]);
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-2 p-0 text-[13px] font-semibold text-fg-secondary">
        Motivo <span className="font-medium text-fg-muted">(obrigatório)</span>
      </legend>
      <div role="radiogroup" aria-label="Motivo" className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
        {reasons.map((r) => (
          <ChoiceCard key={r} compact selected={reason === r} onSelect={() => onReason(r)} title={CHANGE_REASONS[r]} />
        ))}
      </div>
      {reason === "other" && (
        <TextAreaField
          className="mt-2"
          label="Descreva o motivo"
          rows={2}
          maxLength={REASON_NOTE_LIMITS.max}
          value={note}
          onChange={(e) => onNote(e.target.value)}
          hint="Sem nome, e-mail ou dados de saúde: fica guardado na auditoria."
        />
      )}
      {showError && (
        <span role="alert" className="mt-2 flex gap-1.5 text-[13px] text-danger">
          <Icon icon={CircleAlert} size={15} className="mt-0.5 flex-none" />
          {reason === "other" ? "Descreva o motivo (pelo menos 3 letras)." : "Escolha um motivo. Ele fica registrado na auditoria."}
        </span>
      )}
    </fieldset>
  );
}
