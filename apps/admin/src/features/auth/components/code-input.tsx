"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";
import { MFA_CODE_LENGTH } from "@guf/core";
import { cn, Icon } from "@guf/ui";

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoFocus?: boolean;
}

/**
 * Código de 6 números: um campo só (cola, preenchimento automático do celular e leitor de tela
 * funcionam), desenhado como 6 caixas por cima.
 */
export function CodeInput({ value, onChange, error, autoFocus }: CodeInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: MFA_CODE_LENGTH }, (_, i) => value[i] ?? "");
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-fg-secondary">
        Código
      </label>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, MFA_CODE_LENGTH))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-erro` : undefined}
          className="absolute inset-0 z-10 w-full cursor-text opacity-0"
        />
        <div aria-hidden="true" className="grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <span
              key={index}
              className={cn(
                "grid h-15 place-items-center rounded-md border-[1.5px] bg-surface-3 font-display text-[32px] font-bold tabular-nums",
                error ? "border-danger" : focused && index === Math.min(value.length, digits.length - 1) ? "border-focus" : "border-border-strong",
              )}
            >
              {digit}
            </span>
          ))}
        </div>
      </div>
      {error && (
        <span id={`${id}-erro`} role="alert" className="flex items-start gap-1.5 text-[13px] text-danger">
          <Icon icon={CircleAlert} size={15} className="mt-0.5 flex-none" />
          {error}
        </span>
      )}
    </div>
  );
}
