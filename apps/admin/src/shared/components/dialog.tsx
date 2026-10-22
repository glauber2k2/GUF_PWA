"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn, IconButton, ScreenPortal } from "@guf/ui";

interface DialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Mostra o X no canto (diálogos de formulário). */
  showClose?: boolean;
  children: ReactNode;
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo do painel: centralizado no tablet e no computador, folha embaixo no celular (protótipo).
 * Esc e toque fora fecham; o foco fica preso dentro e volta para onde estava ao fechar.
 */
export function Dialog({ open, title, subtitle, onClose, showClose = false, children }: DialogProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <ScreenPortal>
      <div className="fixed inset-0 z-[70] flex flex-col items-center bg-scrim p-2 md:justify-center md:p-8" onClick={onClose}>
        <div className="min-h-0 flex-1 md:hidden" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(event) => event.stopPropagation()}
          className="flex max-h-full w-full max-w-[560px] animate-guf-up flex-col gap-5 overflow-auto rounded-xl bg-surface-elevated p-5 shadow-e3 md:p-7"
        >
          <span aria-hidden="true" className="-my-2 h-1 w-10 self-center rounded-pill bg-border-strong md:hidden" />
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 id={titleId} className="m-0 text-xl leading-[26px] font-bold">
                {title}
              </h2>
              {subtitle && <span className="text-[13px] text-fg-secondary">{subtitle}</span>}
            </div>
            {showClose && <IconButton icon={X} label="Fechar" variant="ghost" onClick={onClose} />}
          </div>
          {children}
        </div>
      </div>
    </ScreenPortal>
  );
}

/** Rodapé com os dois botões lado a lado, mesmo peso de largura. */
export function DialogActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-2.5", className)}>{children}</div>;
}
