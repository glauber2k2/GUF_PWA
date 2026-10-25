"use client";

import { CircleAlert } from "lucide-react";
import { Icon, TextField } from "@guf/ui";

interface ConfirmationWordFieldProps {
  word: string;
  value: string;
  onChange: (value: string) => void;
  /** Mensagem depois de tentar confirmar sem a palavra certa. */
  error?: string;
}

/** "Digite CONFIRMAR para confirmar": trava de mudanças sensíveis (plano, exclusão). */
export function ConfirmationWordField({ word, value, onChange, error }: ConfirmationWordFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <TextField label={`Digite ${word} para confirmar`} autoComplete="off" spellCheck={false} value={value} onChange={(e) => onChange(e.target.value)} />
      {error && (
        <span role="alert" className="flex gap-1.5 text-[13px] text-danger">
          <Icon icon={CircleAlert} size={15} className="mt-0.5 flex-none" />
          {error}
        </span>
      )}
    </div>
  );
}
