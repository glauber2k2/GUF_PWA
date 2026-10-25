export interface KeyboardHint {
  keys: readonly string[];
  label: string;
}

/** Legenda de atalhos de teclado ("N novo · Del excluir"), só no computador: quem chama decide quando mostrar. */
export function KeyboardHints({ hints }: { hints: readonly KeyboardHint[] }) {
  return (
    <p aria-label="Atalhos de teclado" className="m-0 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-fg-muted">
      {hints.map((hint) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          {hint.keys.map((key) => (
            <kbd key={key} className="inline-grid h-6 min-w-6 place-items-center rounded-[6px] border border-border-strong bg-surface-3 px-1.5 font-sans text-xs font-semibold text-fg-secondary">
              {key}
            </kbd>
          ))}
          {hint.label}
        </span>
      ))}
    </p>
  );
}
