"use client";

import { useEffect, useState } from "react";
import { ArrowRight, type LucideIcon } from "lucide-react";
import { Button, GufRat, Icon } from "@/shared/components/ds";

/** Espera curta antes de fechar o anel (a tela entra primeiro). */
const RING_CLOSE_DELAY_MS = 80;

export interface PasswordSuccessProps {
  title: string;
  text: string;
  rows: ReadonlyArray<{ icon: LucideIcon; text: string }>;
  ctaLabel: string;
  onCta: () => void;
}

/** Senha salva: o anel fecha em volta do Guf Rat, o resumo do que aconteceu e o próximo passo. */
export function PasswordSuccess({ title, text, rows, ctaLabel, onCta }: PasswordSuccessProps) {
  const [isClosed, setClosed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setClosed(true), RING_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-background px-6 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(28px+env(safe-area-inset-bottom))] text-fg">
      <div role="status" className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <div className="relative grid size-[148px] place-items-center">
          <span aria-hidden="true" className="absolute inset-[14px] animate-guf-success-halo rounded-pill border-2 border-accent" />
          <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
            <circle cx="24" cy="24" r="21" fill="none" strokeWidth="2.5" className="stroke-surface-3" />
            <circle
              cx="24"
              cy="24"
              r="21"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={isClosed ? 0 : 100}
              className="stroke-accent transition-[stroke-dashoffset] duration-800 ease-standard"
            />
          </svg>
          <div className="animate-guf-rise [animation-delay:200ms]">
            <GufRat occasion="saved" size={104} />
          </div>
        </div>
        <div className="flex animate-guf-rise flex-col gap-2 [animation-delay:450ms]">
          <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em]">{title}</h1>
          <p className="m-0 text-[15px] leading-[22px] text-pretty text-fg-secondary">{text}</p>
        </div>
        <ul className="m-0 flex w-full animate-guf-rise list-none flex-col rounded-lg border border-border bg-surface p-0 text-left [animation-delay:600ms]">
          {rows.map((row, index) => (
            <li key={row.text} className={`flex items-center gap-3 px-4 py-3.5 ${index > 0 ? "border-t border-border" : ""}`}>
              <Icon icon={row.icon} size={18} className="flex-none text-accent-text" />
              <span className="flex-1 text-sm leading-5 text-fg-secondary">{row.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="animate-guf-rise pt-4 [animation-delay:750ms]">
        <Button variant="primary" size="lg" fullWidth iconRight={ArrowRight} onClick={onCta}>
          {ctaLabel}
        </Button>
      </div>
    </main>
  );
}
