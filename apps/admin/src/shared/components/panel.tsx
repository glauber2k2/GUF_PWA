import type { ReactNode } from "react";
import { cn } from "@guf/ui";

/** Título de seção em versalete (CONTA, LOGINS, PLANO…). */
export function SectionTitle({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <h3 id={id} className={cn("m-0 px-1 text-overline font-semibold tracking-[.08em] text-fg-muted uppercase", className)}>
      {children}
    </h3>
  );
}

/** Cartão com divisórias entre as linhas. */
export function Panel({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol" | "dl" }) {
  return (
    <Tag className={cn("m-0 list-none overflow-hidden rounded-lg border border-border bg-surface p-0 [&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border", className)}>
      {children}
    </Tag>
  );
}

/** Seção com título e cartão. */
export function PanelSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <SectionTitle id={id}>{title}</SectionTitle>
      {children}
    </section>
  );
}

/** Linha rótulo/valor dentro de um <dl>. */
export function InfoRow({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-h-13 flex-wrap items-center gap-3 py-1 pr-2 pl-4", className)}>
      <dt className="flex-1 text-fg-secondary">{label}</dt>
      <dd className="m-0 flex items-center gap-1">{children}</dd>
    </div>
  );
}

/** Título grande da página (no celular o título fica na barra de cima). */
export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="hidden flex-wrap items-center justify-between gap-4 md:flex">
      <h2 className="m-0 text-[clamp(24px,2.4vw,32px)] leading-tight font-bold tracking-[-0.02em]">{children}</h2>
      {actions}
    </div>
  );
}

/** Miolo rolável das páginas, centralizado. */
export function PageBody({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className={cn("mx-auto flex w-full flex-col gap-5 p-4 pb-28 md:gap-6 md:p-8 md:pb-10", wide ? "max-w-[1240px]" : "max-w-[1120px]")}>
      {children}
    </div>
  );
}
