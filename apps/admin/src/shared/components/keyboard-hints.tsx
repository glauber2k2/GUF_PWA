import { cn } from "@guf/ui";
import type { KeyboardHint } from "@/shared/helpers/shortcuts";

export type { KeyboardHint };

/** Uma tecla desenhada (legendas, ajuda "?", menu e busca). */
export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd className={cn("inline-grid h-6 min-w-6 place-items-center rounded-[6px] border border-border-strong bg-surface-3 px-1.5 font-sans text-xs font-semibold text-fg-secondary", className)}>
      {children}
    </kbd>
  );
}

/** Teclas de um atalho lado a lado (ex.: ↑ ↓). */
export function KbdKeys({ keys }: { keys: readonly string[] }) {
  return (
    <>
      {keys.map((key) => (
        <Kbd key={key}>{key}</Kbd>
      ))}
    </>
  );
}

/** Legenda de atalhos de teclado ("N novo · Del excluir"), só no computador: quem chama decide quando mostrar. */
export function KeyboardHints({ hints }: { hints: readonly KeyboardHint[] }) {
  return (
    <p aria-label="Atalhos de teclado" className="m-0 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-fg-muted">
      {hints.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          <KbdKeys keys={hint.keys} />
          {hint.label}
        </span>
      ))}
    </p>
  );
}
