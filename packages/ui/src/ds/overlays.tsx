"use client";

import { useEffect, type ReactNode } from "react";
import { Play, Plus, type LucideIcon } from "lucide-react";
import { useSheetDrag } from "../hooks/use-sheet-drag";
import { cn } from "../helpers/class-names";
import { BOTTOM_BAR_PROPS } from "./bottom-bar";
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
  /** Cabeçalho próprio no lugar do título (ex.: voltar · título · fechar); o title continua como rótulo acessível. */
  header?: ReactNode;
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
  header,
  onClose,
  placement = "container",
  children,
  className,
}: BottomSheetProps) {
  const screen = placement === "screen";
  const { sheetRef, offset, progress, dragProps } = useSheetDrag(onClose);
  const dragging = offset !== null;

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
        // Durante o arraste, o fundo clareia junto (valor dinâmico).
        style={dragging ? { opacity: 1 - progress } : undefined}
        className={cn(
          "absolute inset-0 bg-scrim",
          dragging ? "transition-none" : "transition-opacity duration-300 ease-standard",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        ref={sheetRef}
        // Barra do rodapé enquanto está na tela: a pilha de avisos sobe junto e fica acima da folha.
        {...BOTTOM_BAR_PROPS}
        role="dialog"
        aria-modal={open || undefined}
        aria-label={title}
        // Durante o arraste, a folha acompanha o dedo (valor dinâmico).
        style={dragging ? { translate: `0 ${offset}px` } : undefined}
        className={cn(
          // Coluna minmax(0,1fr): sem ela, texto com truncate alarga a coluna além da folha e come o recuo da direita.
          "absolute inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)] gap-2.5 rounded-t-xl bg-surface-elevated px-4 pt-2 pb-5 shadow-e3",
          screen && "mx-auto max-w-[430px] pb-[calc(20px+env(safe-area-inset-bottom))]",
          open ? "translate-y-0" : "translate-y-full",
          dragging
            ? "transition-none"
            : open
              ? "transition-transform duration-300 ease-enter"
              : "transition-transform duration-200 ease-exit",
          className,
        )}
      >
        {/* Área de arraste: alça + título (arrastar para baixo fecha). Ocupa a largura toda e o topo da folha. */}
        <div
          {...dragProps}
          className={cn("-mx-4 -mt-2 -mb-2 grid gap-2.5 px-4 pt-2 pb-2", onClose && "cursor-grab touch-none select-none active:cursor-grabbing")}
        >
          <span className="mb-1.5 h-[5px] w-9 justify-self-center rounded-pill bg-border-strong" />
          {header ??
            ((title || subtitle) && (
              <div className="flex items-baseline justify-between gap-2">
                <strong className="text-lg">{title}</strong>
                {subtitle && <span className="text-xs text-fg-muted">{subtitle}</span>}
              </div>
            ))}
        </div>
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
  /** Indisponível agora (ex.: sem internet); o subtítulo explica o motivo. */
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SheetOption({
  letter,
  icon,
  title,
  subtitle,
  highlighted = false,
  dashed = false,
  disabled = false,
  onClick,
  className,
}: SheetOptionProps) {
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
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3 rounded-[14px] px-3.5 text-left text-fg",
        highlighted ? "min-h-16 border-[1.5px] border-accent-text bg-accent/10" : "min-h-14 border border-border bg-surface",
        disabled && "cursor-not-allowed opacity-55",
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

export interface DangerSheetOptionProps {
  icon: LucideIcon;
  title: string;
  /** Motivo de estar indisponível (ex.: "Sem conexão: conecte-se para excluir"). */
  subtitle?: string;
  disabled?: boolean;
  onClick: () => void;
}

/** Opção destrutiva da folha (ex.: "Excluir treino"): em vermelho, separada das demais pelo tom. */
export function DangerSheetOption({ icon, title, subtitle, disabled = false, onClick }: DangerSheetOptionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-[60px] w-full items-center gap-3 rounded-[14px] border border-danger/40 bg-danger/12 px-3.5 py-2.5 text-left text-danger transition-colors duration-150 ease-standard",
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer hover:bg-danger/20",
      )}
    >
      <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-danger/16">
        <Icon icon={icon} size={18} />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-[15px] leading-5 font-semibold">{title}</span>
        {subtitle && <span className="text-[13px] leading-[18px] text-fg-secondary">{subtitle}</span>}
      </span>
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
  /**
   * Botões com o MESMO peso visual (contorno), confirmar em vermelho. Para escolhas que o usuário
   * precisa fazer sem ser empurrado (LGPD: revogar consentimento, sair com dados pendentes).
   */
  balanced?: boolean;
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
  balanced = false,
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
            // Foco começa na opção segura.
            autoFocus={balanced}
            className="h-12 cursor-pointer rounded-md border border-border-strong bg-transparent text-[15px] font-semibold text-fg"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-12 cursor-pointer rounded-md text-[15px]",
              balanced
                ? "border border-border-strong bg-transparent font-semibold text-danger hover:bg-danger/12"
                : destructive
                  ? "bg-danger font-bold text-danger-foreground"
                  : "bg-accent font-bold text-accent-foreground active:bg-accent-pressed",
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
