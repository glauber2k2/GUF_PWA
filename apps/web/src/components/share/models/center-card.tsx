// Stories · cartão centralizado (Claude Design · StoryArt, modelos 36–38): cartão de 780 px ampliado
// 1,2× no meio da arte, com a logo e um rótulo no topo e a assinatura no rodapé.
import type { ReactNode } from "react";
import { Logo } from "@/components/ds";
import { STORY_DOMAIN, STORY_SIGNATURE_LEAD } from "../story-types";

export interface StoryCenterCardProps {
  /** Texto à direita da logo (data, mês). */
  label: string;
  children: ReactNode;
}

export function StoryCenterCard({ label, children }: StoryCenterCardProps) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.2]">
      <div className="flex w-[780px] flex-col gap-[24px] rounded-[48px] border-[3px] border-border-strong bg-surface p-[44px]">
        <div className="flex items-center justify-between">
          {/* 88 px na arte (73 × 1,2). */}
          <Logo className="h-[73px]" />
          <span className="text-[30px] font-semibold text-fg">{label}</span>
        </div>
        {children}
        <span className="text-[28px] font-semibold text-fg">
          {STORY_SIGNATURE_LEAD} <span className="text-accent-text">{STORY_DOMAIN}</span>
        </span>
      </div>
    </div>
  );
}

/** Linhas de exercício do treino ("1 · Agachamento livre · 4 × 8 · 120 kg"). */
export function StoryExerciseRows({ rows }: { rows: ReadonlyArray<{ name: string; scheme: string; loadShort: string }> }) {
  return (
    <div className="flex flex-col">
      {rows.map((r, i) => (
        <div key={r.name} className="flex h-[84px] items-center gap-[18px] border-t-2 border-border">
          <span className="flex size-[48px] flex-none items-center justify-center rounded-[12px] bg-surface-3 font-display text-[34px] font-bold text-fg">
            {i + 1}
          </span>
          <span className="min-w-0 flex-1 truncate text-[34px] font-semibold">{r.name}</span>
          <span className="flex-none font-display text-[38px] font-semibold">
            {r.scheme}
            <span className="text-fg"> · </span>
            <span className="font-bold text-accent-text">{r.loadShort}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
