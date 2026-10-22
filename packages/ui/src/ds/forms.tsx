"use client";

import { useId, useState, type ComponentPropsWithRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check, CircleAlert, Eye, EyeOff, Search, type LucideIcon } from "lucide-react";
import { PASSWORD_STRENGTH_LABELS, passwordStrength, type PasswordStrength } from "@guf/core";
import { cn } from "../helpers/class-names";
import { Icon } from "./brand";

const FIELD_LABEL = "text-[13px] font-medium text-fg-secondary";
const FIELD_INPUT =
  "w-full rounded-md border bg-background px-3.5 text-base text-fg outline-none placeholder:text-fg-muted focus-visible:outline-none disabled:opacity-50";
/** md 48px (padrão) · lg 52px (telas de acesso: login e cadastro). */
const FIELD_HEIGHT = { md: "h-12", lg: "h-[52px]" } as const;
const FIELD_BORDER_OK = "border-border-strong focus:border-focus focus:shadow-focus";
const FIELD_BORDER_ERROR = "border-[1.5px] border-danger";

export type FieldSize = keyof typeof FIELD_HEIGHT;

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="flex items-center gap-1.5 text-xs text-danger">
      <Icon icon={CircleAlert} size={14} />
      {children}
    </span>
  );
}

export interface TextFieldProps extends Omit<ComponentPropsWithRef<"input">, "size"> {
  label?: string;
  error?: string;
  hint?: string;
  size?: FieldSize;
}

/** Campo de texto com label acima; erro com ícone e borda 1,5px danger; foco com halo. Aceita `ref` (React Hook Form). */
export function TextField({ label, error, hint, size = "md", id, className, ...rest }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(FIELD_INPUT, FIELD_HEIGHT[size], error ? FIELD_BORDER_ERROR : FIELD_BORDER_OK)}
        {...rest}
      />
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <span id={messageId} className="text-xs text-fg-muted">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export interface TextAreaFieldProps extends ComponentPropsWithRef<"textarea"> {
  label?: string;
  error?: string;
  hint?: string;
}

/** Texto de várias linhas (descrições), com o mesmo visual do TextField. Aceita `ref` (React Hook Form). */
export function TextAreaField({ label, error, hint, id, rows = 3, className, ...rest }: TextAreaFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <label htmlFor={inputId} className={FIELD_LABEL}>
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? messageId : undefined}
        className={cn(FIELD_INPUT, "min-h-[88px] resize-none py-3 leading-[22px]", error ? FIELD_BORDER_ERROR : FIELD_BORDER_OK)}
        {...rest}
      />
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : hint ? (
        <span id={messageId} className="text-right text-xs text-fg-muted tabular-nums">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

const STRENGTH_COLORS: Record<PasswordStrength, string> = {
  0: "bg-danger",
  1: "bg-danger",
  2: "bg-warning",
  3: "bg-data",
  4: "bg-success",
};
const STRENGTH_TEXT: Record<PasswordStrength, string> = {
  0: "text-danger",
  1: "text-danger",
  2: "text-warning",
  3: "text-data",
  4: "text-success",
};

export interface PasswordFieldProps
  extends Omit<ComponentPropsWithRef<"input">, "type" | "value" | "defaultValue" | "size"> {
  label?: string;
  value?: string;
  defaultValue?: string;
  showStrength?: boolean;
  error?: string;
  size?: FieldSize;
}

/**
 * Senha com mostrar/ocultar e medidor de força (4 barras).
 * Aceita `ref`/`name`/`onChange`/`onBlur` do React Hook Form (register).
 */
export function PasswordField({
  label = "Senha",
  value,
  defaultValue = "",
  onChange,
  showStrength = true,
  error,
  size = "md",
  id,
  className,
  ...rest
}: PasswordFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  const strengthId = `${inputId}-strength`;
  const [inner, setInner] = useState(defaultValue);
  const [visible, setVisible] = useState(false);
  const password = value ?? inner;
  const score = passwordStrength(password);
  const describedBy = [error ? messageId : null, showStrength ? strengthId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={inputId} className={FIELD_LABEL}>
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          value={password}
          autoComplete="new-password"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(e) => {
            setInner(e.target.value);
            onChange?.(e);
          }}
          className={cn(FIELD_INPUT, FIELD_HEIGHT[size], "pr-[52px]", error ? FIELD_BORDER_ERROR : FIELD_BORDER_OK)}
          {...rest}
        />
        <button
          type="button"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          className="absolute right-1 grid size-11 cursor-pointer place-items-center text-fg-secondary"
        >
          <Icon icon={visible ? EyeOff : Eye} size={18} />
        </button>
      </div>
      {error && <FieldError id={messageId}>{error}</FieldError>}
      {showStrength && (
        <>
          <div className="mt-0.5 grid grid-cols-4 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn("h-1 rounded-[2px]", i < score ? STRENGTH_COLORS[score] : "bg-surface-3")}
              />
            ))}
          </div>
          <span id={strengthId} className="text-xs text-fg-secondary" aria-live="polite">
            Força: <strong className={STRENGTH_TEXT[score]}>{PASSWORD_STRENGTH_LABELS[score]}</strong> · use 8+
            caracteres, número e símbolo
          </span>
        </>
      )}
    </div>
  );
}

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  placeholder?: string;
}

export function SearchField({ placeholder = "Buscar exercício", className, ...rest }: SearchFieldProps) {
  return (
    <div className={cn("relative flex items-center", className)}>
      <Icon icon={Search} size={18} className="absolute left-3.5 text-fg-muted" />
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          "h-12 w-full flex-1 rounded-pill border border-border bg-surface-3 pr-3.5 pl-11 text-base text-fg",
          "outline-none placeholder:text-fg-muted focus:border-focus focus-visible:outline-none",
        )}
        {...rest}
      />
    </div>
  );
}

export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  /** O rótulo vale só para leitores de tela (a linha já mostra o título ao lado). */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Interruptor: a bolinha desliza (parada com movimento reduzido) e o rótulo quebra linha em telas estreitas. */
export function Switch({ checked, defaultChecked = false, onChange, label, hideLabel = false, disabled = false, className }: SwitchProps) {
  const [inner, setInner] = useState(defaultChecked);
  const on = checked ?? inner;
  const active = on && !disabled;
  // Com rótulo visível, a linha inteira fica esmaecida; sozinho, o próprio botão.
  const standalone = !label || hideLabel;
  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        setInner(!on);
        onChange?.(!on);
      }}
      className={cn(
        "group flex h-8 w-[52px] flex-none cursor-pointer items-center rounded-pill p-[3px] transition-colors duration-200 ease-standard",
        active ? "bg-accent" : "bg-surface-3",
        disabled && "cursor-not-allowed",
        disabled && standalone && "opacity-50",
      )}
    >
      {/* 52 − 2×3 (borda interna) − 26 (bolinha) = 20 px de curso. */}
      <span
        className={cn(
          "size-[26px] rounded-pill shadow-thumb transition-[translate,background-color,scale] duration-200 ease-standard",
          "group-active:scale-[0.92] motion-reduce:group-active:scale-100",
          on ? "translate-x-5" : "translate-x-0",
          active ? "bg-accent-foreground" : "bg-fg-muted",
        )}
      />
    </button>
  );
  if (standalone) return control;
  return (
    <div className={cn("flex min-h-11 items-center justify-between gap-3", disabled && "opacity-50", className)}>
      <span className="min-w-0 flex-1 text-[15px] text-pretty" aria-hidden="true">
        {label}
      </span>
      {control}
    </div>
  );
}

export interface CheckboxProps extends Omit<ComponentPropsWithRef<"input">, "type" | "children"> {
  /** Texto do rótulo; pode conter links (abrem sem marcar a caixa). */
  children?: ReactNode;
  error?: string;
}

/**
 * Checkbox com input nativo (acessível e compatível com React Hook Form via register).
 * LGPD: consentimentos sempre começam desmarcados — não passe defaultChecked/checked true.
 * O visual segue o input pelo CSS (peer-checked), sem estado interno.
 */
export function Checkbox({ children, error, id, className, disabled, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-msg`;
  return (
    <div className={cn("grid gap-1", className)}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-11 cursor-pointer items-start gap-3 text-left text-[15px] leading-[22px] text-fg",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
          className="peer sr-only"
          {...rest}
        />
        <span
          aria-hidden="true"
          className={cn(
            "-mt-px grid size-6 flex-none place-items-center rounded-[7px] border-2 border-border-strong bg-transparent",
            "text-transparent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-accent-foreground",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
            error && "border-danger",
          )}
        >
          <Icon icon={Check} size={16} />
        </span>
        <span>{children}</span>
      </label>
      {error && <FieldError id={messageId}>{error}</FieldError>}
    </div>
  );
}

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label: string;
  className?: string;
}

export function RadioGroup({ options, value, defaultValue, onChange, label, className }: RadioGroupProps) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value);
  const current = value ?? inner;
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-1", className)}>
      {options.map((o) => {
        const on = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => {
              setInner(o.value);
              onChange?.(o.value);
            }}
            className="flex min-h-11 cursor-pointer items-center gap-3 bg-transparent p-0 text-left text-[15px] text-fg"
          >
            <span
              className={cn(
                "grid size-6 flex-none place-items-center rounded-pill border-2",
                on ? "border-accent-text" : "border-border-strong",
              )}
            >
              <span className={cn("size-3 rounded-pill", on ? "bg-accent-text" : "bg-transparent")} />
            </span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SegmentOption {
  value: string;
  label: string;
  icon?: LucideIcon;
}

export interface SegmentedControlProps {
  options: Array<string | SegmentOption>;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** "track": trilho surface-3 com item elevado; "solid": pílula preenchida com text-primary. */
  variant?: "track" | "solid";
  shape?: "pill" | "rounded";
  size?: "md" | "sm";
  label: string;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onChange,
  variant = "track",
  shape = "pill",
  size = "md",
  label,
  className,
}: SegmentedControlProps) {
  const items: SegmentOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const [inner, setInner] = useState(defaultValue ?? items[0]?.value);
  const current = value ?? inner;
  const pick = (v: string) => {
    setInner(v);
    onChange?.(v);
  };

  if (variant === "solid") {
    return (
      <div role="group" aria-label={label} className={cn("flex gap-1", className)}>
        {items.map((o) => {
          const on = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => pick(o.value)}
              className={cn(
                "h-9 flex-1 cursor-pointer rounded-pill px-3 text-[13px] font-semibold",
                on ? "bg-fg text-background" : "bg-transparent text-fg-secondary",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  const sm = size === "sm";
  const pill = shape === "pill";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "gap-0.5 bg-surface-3 p-[3px]",
        sm ? "inline-flex" : "flex",
        pill ? "rounded-pill" : "rounded-md",
        className,
      )}
    >
      {items.map((o) => {
        const on = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => pick(o.value)}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1.5 font-semibold",
              sm ? "h-8 flex-none px-3 text-[13px]" : pill ? "h-10 flex-1 text-sm" : "h-[38px] flex-1 text-[13px]",
              pill ? "rounded-pill" : "rounded-[10px]",
              on ? "bg-surface-elevated text-fg shadow-control" : "bg-transparent text-fg-secondary",
            )}
          >
            {o.icon && <Icon icon={o.icon} size={14} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
