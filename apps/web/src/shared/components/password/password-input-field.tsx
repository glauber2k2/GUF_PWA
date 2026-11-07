"use client";

import { useState, type ReactNode } from "react";
import { Check, CircleAlert, CircleCheck, Eye, EyeOff, type LucideIcon } from "lucide-react";
import { Icon } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

export interface PasswordInputFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: LucideIcon;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
  /** Requisito cumprido: check verde dentro do campo. */
  isOk?: boolean;
  /** Erro (borda e mensagem em vermelho). */
  error?: string | null;
  /** Mensagem de sucesso (ex.: "As senhas coincidem"). */
  success?: string | null;
  /** Muda a cada recusa do servidor: o campo treme de novo. */
  shakeKey?: number;
  /** Ação ao lado do rótulo (ex.: "Esqueci minha senha"). */
  labelAction?: ReactNode;
  /** Conteúdo abaixo do campo (ex.: o painel de força). */
  children?: ReactNode;
}

/** Campo de senha do protótipo: ícone, check quando cumprido, mostrar/ocultar e a mensagem embaixo. */
export function PasswordInputField({
  id,
  label,
  value,
  onChange,
  icon,
  autoComplete,
  placeholder,
  isOk = false,
  error = null,
  success = null,
  shakeKey = 0,
  labelAction,
  children,
}: PasswordInputFieldProps) {
  const [isVisible, setVisible] = useState(false);
  const message = error ?? success;
  const messageId = `${id}-msg`;
  return (
    <div className="flex animate-guf-rise flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-fg-secondary">
          {label}
        </label>
        {labelAction}
      </div>
      <div
        key={shakeKey}
        className={cn(
          "group flex h-[52px] items-center gap-2 rounded-md border-[1.5px] bg-surface pr-1 pl-3.5 transition-[border-color,box-shadow] duration-150",
          error
            ? "border-danger ring-3 ring-danger/20"
            : isOk
              ? "border-success/60 focus-within:border-focus focus-within:ring-3 focus-within:ring-focus/30"
              : "border-border-strong focus-within:border-focus focus-within:ring-3 focus-within:ring-focus/30",
          error && shakeKey > 0 && "animate-guf-field-shake",
        )}
      >
        <Icon
          icon={icon}
          size={18}
          className={cn("flex-none transition-colors", error ? "text-danger" : "text-fg-muted group-focus-within:text-accent-text")}
        />
        <input
          id={id}
          type={isVisible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            "h-full min-w-0 flex-1 border-0 bg-transparent text-base font-medium text-fg outline-none placeholder:text-fg-muted",
            !isVisible && value && "tracking-[0.12em]",
          )}
        />
        {isOk && !error && (
          <span aria-hidden="true" className="grid size-[22px] flex-none animate-guf-pop-badge place-items-center rounded-pill bg-success text-background">
            <Icon icon={Check} size={13} />
          </span>
        )}
        <button
          type="button"
          onClick={() => setVisible((visible) => !visible)}
          aria-label={isVisible ? "Ocultar senha" : "Mostrar senha"}
          className="grid size-11 flex-none cursor-pointer place-items-center rounded-[10px] border-0 bg-transparent text-fg-secondary hover:bg-surface-3 hover:text-fg"
        >
          <Icon icon={isVisible ? EyeOff : Eye} size={20} />
        </button>
      </div>
      {message && (
        <span
          id={messageId}
          role={error ? "alert" : undefined}
          className={cn("flex animate-guf-rise-fast items-center gap-1.5 text-[13px] leading-[18px]", error ? "text-danger" : "text-success")}
        >
          <Icon icon={error ? CircleAlert : CircleCheck} size={15} />
          {message}
        </span>
      )}
      {children}
    </div>
  );
}
