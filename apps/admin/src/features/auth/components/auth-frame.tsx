import type { ReactNode } from "react";
import { AdminWordmark, EnvironmentBadge } from "@/shared/components/badges";

/** Moldura das telas de acesso: marca e ambiente no topo, conteúdo centralizado (até 420 px). */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center justify-between gap-3 px-[clamp(16px,3vw,40px)] py-4">
        <AdminWordmark />
        <EnvironmentBadge />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 pt-4 pb-12">
        <div className="flex w-full max-w-[420px] animate-guf-rise flex-col gap-6">{children}</div>
      </main>
    </div>
  );
}

export function AuthHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      {eyebrow && <span className="text-overline font-semibold tracking-[.08em] text-fg-muted uppercase">{eyebrow}</span>}
      <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em]">{title}</h1>
      {children && <p className="m-0 text-pretty text-fg-secondary">{children}</p>}
    </div>
  );
}
