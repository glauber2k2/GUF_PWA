"use client";

import { useEffect, type ReactNode } from "react";
import { Play, Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Icon } from "./brand";
import { ScreenPortal } from "./portal";

/*
 * Overlays: por padrão usam position:absolute (dentro de um container com position:relative,
 * como na vitrine). Nas telas do app, use placement="screen" (fixo na viewport, renderizado no <body>
 * por portal — nunca dentro de um ancestral com transform/animação).
 */

export interface BottomSheetProps {
  open?: boolean;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  /** "container": dentro do pai (vitrine) · "screen": sobre a tela inteira (app). */
  placement?: "container" | "screen";
  children?: ReactNode;
  className?: string;
}

export function BottomSheet({
  open = true,
  title,
  subtitle,
  onClose,
  placement = "container",
  children,
  className,
}: BottomSheetProps) {
  const screen = placement === "screen";

  // Esc fecha a folha aberta.
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sheet = (
    <div
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "inset-0",
        // Acima de telas cheias (seletor de exercícios, z-50): as folhas também podem abrir sobre elas.
        screen ? "fixed z-[60]" : "absolute z-30",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-scrim transition-opacity duration-300 ease-standard",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal={open || undefined}
        aria-label={title}
        className={cn(
          "absolute inset-x-0 bottom-0 grid gap-2.5 rounded-t-xl bg-surface-elevated px-4 pt-2 pb-5 shadow-e3",
          screen && "mx-auto max-w-[430px] pb-[calc(20px+env(safe-area-inset-bottom))]",
          open
            ? "translate-y-0 transition-transform duration-300 ease-enter"
            : "translate-y-full transition-transform duration-200 ease-exit",
          className,
        )}
      >
        <span className="mb-1.5 h-[5px] w-9 justify-self-center rounded-pill bg-border-strong" />
        {(title || subtitle) && (
          <div className="flex items-baseline justify-between gap-2">
            <strong className="text-lg">{title}</strong>
            {subtitle && <span className="text-xs text-fg-muted">{subtitle}</span>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
  return screen ? <ScreenPortal>{sheet}</ScreenPortal> : sheet;
}

export interface SheetOptionProps {
  letter?: string;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  /** Opção sugerida: borda accent-text 1,5px + fundo volt 10% + ícone play. */
  highlighted?: boolean;
  /** Ação de "adicionar" (borda tracejada). */
  dashed?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SheetOption({ letter, icon, title, subtitle, highlighted = false, dashed = false, onClick, className }: SheetOptionProps) {
  if (dashed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-dashed border-border-strong",
          "bg-transparent text-[15px] font-semibold text-fg",
          className,
        )}
      >
        <Icon icon={icon ?? Plus} size={18} />
        {title}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3.5 text-left text-fg",
        highlighted ? "min-h-16 border-[1.5px] border-accent-text bg-accent/10" : "min-h-14 border border-border bg-surface",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-9 flex-none place-items-center rounded-[10px] font-display text-lg font-bold",
          highlighted ? "bg-accent text-accent-foreground" : "bg-surface-3 text-fg",
        )}
      >
        {icon ? <Icon icon={icon} size={18} /> : letter}
      </span>
      <span className="grid flex-1">
        <strong className="text-[15px]">{title}</strong>
        {subtitle && <span className="text-xs text-fg-muted">{subtitle}</span>}
      </span>
      {highlighted && <Icon icon={Play} size={18} className="text-accent-text" />}
    </button>
  );
}

export interface ConfirmDialogProps {
  open?: boolean;
  title: string;
  /** Mostre a consequência: "2 séries não foram concluídas e não entram no histórico." */
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  /** "container": dentro do pai, no topo (vitrine) · "screen": fixo na tela, na zona do polegar (app). */
  placement?: "container" | "screen";
  className?: string;
}

export function ConfirmDialog({
  open = true,
  title,
  message,
  cancelLabel = "Continuar",
  confirmLabel = "Finalizar",
  destructive = false,
  onCancel,
  onConfirm,
  placement = "container",
  className,
}: ConfirmDialogProps) {
  if (!open) return null;
  const screen = placement === "screen";
  const dialog = (
    <div className={cn("inset-0", screen ? "fixed z-[70]" : "absolute z-40")}>
      <div onClick={onCancel} className="absolute inset-0 bg-scrim" />
      <div
        role="alertdialog"
        aria-label={title}
        aria-modal={screen || undefined}
        className={cn(
          "absolute inset-x-4 grid gap-3 rounded-xl bg-surface-elevated p-5 shadow-e3",
          screen ? "bottom-[calc(40px+env(safe-area-inset-bottom))] mx-auto max-w-[398px] animate-guf-up" : "top-10",
          className,
        )}
      >
        <strong className="text-lg">{title}</strong>
        {message && <span className="text-sm leading-5 text-fg-secondary">{message}</span>}
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-12 cursor-pointer rounded-md border border-border-strong bg-transparent text-[15px] font-semibold text-fg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-12 cursor-pointer rounded-md text-[15px] font-bold",
              destructive ? "bg-danger text-danger-foreground" : "bg-accent text-accent-foreground active:bg-accent-pressed",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
  return screen ? <ScreenPortal>{dialog}</ScreenPortal> : dialog;
}

export interface ToastProps {
  message: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/** Toast invertido (fundo text-primary, texto background). */
export function Toast({ message, icon, actionLabel, onAction, className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn("flex h-[52px] items-center gap-2.5 rounded-[14px] bg-fg pr-1.5 pl-4 text-background shadow-e3", className)}
    >
      {icon && <Icon icon={icon} size={16} />}
      <span className="flex-1 text-sm font-medium">{message}</span>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="h-10 cursor-pointer rounded-[10px] bg-transparent px-3 text-sm font-bold text-background underline underline-offset-[3px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
