import type { ButtonHTMLAttributes, ReactNode } from "react";
import { LoaderCircle, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./brand";

const PRESS = "active:scale-[.97] motion-reduce:active:scale-100";

const BUTTON_SIZES = {
  md: { box: "h-11 px-[18px] text-[15px]", ghostPx: "px-4", icon: 16 },
  tall: { box: "h-12 px-5 text-[15px]", ghostPx: "px-[18px]", icon: 16 },
  lg: { box: "h-14 px-6 text-base", ghostPx: "px-[22px]", icon: 18 },
} as const;

const BUTTON_VARIANTS = {
  primary: "bg-accent text-accent-foreground hover:brightness-[1.06] active:bg-accent-pressed active:brightness-100",
  secondary: "bg-surface-3 text-fg border border-border-strong hover:bg-surface-elevated",
  outline: "bg-transparent text-fg border border-border-strong hover:bg-surface-3",
  ghost: "bg-transparent text-fg hover:bg-surface-3",
  danger: "bg-danger/16 text-danger hover:bg-danger/24",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = "button",
  onClick,
  className,
  children,
  ...rest
}: ButtonProps) {
  const s = BUTTON_SIZES[size];
  const bold = variant === "primary" || size === "lg";
  return (
    <button
      type={type}
      disabled={disabled}
      aria-busy={loading || undefined}
      onClick={disabled || loading ? undefined : onClick}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md whitespace-nowrap",
        "transition-[transform,background-color] duration-150 ease-standard active:duration-100",
        s.box,
        variant === "ghost" && s.ghostPx,
        bold ? "font-bold" : "font-semibold",
        fullWidth && "w-full",
        disabled ? "cursor-not-allowed bg-surface-3 text-fg-muted" : cn(BUTTON_VARIANTS[variant], PRESS),
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Icon icon={LoaderCircle} size={s.icon} spin />
      ) : icon ? (
        <Icon icon={icon} size={s.icon} />
      ) : null}
      {children}
      {iconRight && !loading ? <Icon icon={iconRight} size={s.icon} /> : null}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  /** Rótulo acessível em pt-BR (obrigatório em botões só com ícone). */
  label: string;
  variant?: "secondary" | "ghost" | "primary";
  size?: number;
  iconSize?: number;
  pressed?: boolean;
}

export function IconButton({
  icon,
  label,
  variant = "secondary",
  size = 44,
  iconSize = 20,
  pressed,
  disabled = false,
  className,
  style,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={cn(
        "grid flex-none cursor-pointer place-items-center transition-colors duration-150 ease-standard",
        size >= 44 ? "rounded-md" : "rounded-[10px]",
        variant === "primary" && "bg-accent text-accent-foreground",
        variant === "ghost" && "bg-transparent text-fg-secondary hover:bg-surface-3",
        variant === "secondary" && "bg-surface-3 text-fg hover:bg-surface-elevated",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      <Icon icon={icon} size={iconSize} />
    </button>
  );
}

export interface FabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon?: LucideIcon;
  label: string;
}

export function Fab({ icon = Plus, label, className, ...rest }: FabProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "grid size-16 cursor-pointer place-items-center rounded-pill bg-accent text-accent-foreground shadow-e3",
        "transition-transform duration-100 ease-standard active:scale-[.94] motion-reduce:active:scale-100",
        className,
      )}
      {...rest}
    >
      <Icon icon={icon} size={28} />
    </button>
  );
}

export interface GoogleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label?: string;
}

/** "Continuar com Google": usa o "G" oficial multicolorido (exceção à regra monocromática). */
export function GoogleButton({ label = "Continuar com Google", className, ...rest }: GoogleButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-[52px] w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-google-border",
        "bg-google-surface text-[15px] font-medium text-google-text hover:bg-google-surface-hover",
        className,
      )}
      {...rest}
    >
      <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
        <path
          fill="var(--google-red)"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="var(--google-blue)"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="var(--google-yellow)"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="var(--google-green)"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      {label}
    </button>
  );
}
