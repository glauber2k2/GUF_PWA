// Cartão "Comparação de peso" (Claude Design · Comparacoes de Peso; modelo Comparação de peso): o Guf Rat levanta
// o objeto equivalente ao volume do treino. 600 px de largura; quem usa decide a escala.
import type { LiftEffort, StoryComparison } from "@guf/core";
import { GufRat, Logo, type GufRatOccasion } from "@/components/ds";
import { cn } from "@/lib/utils";
import { STORY_DOMAIN, STORY_SIGNATURE_LEAD } from "./story-types";
import { WeightObject } from "./weight-objects";

/** Pose do Guf Rat por esforço. */
const RAT_BY_EFFORT: Record<LiftEffort, GufRatOccasion> = {
  light: "liftLight",
  normal: "lift",
  heavy: "liftHeavy",
  impossible: "liftImpossible",
};

export interface WeightComparisonCardProps {
  comparison: StoryComparison;
  /** Volume levantado na unidade do usuário ("4.164"). */
  volume: string;
  unit: string;
  /** Linha abaixo da frase (nome do treino). */
  caption?: string;
  /** Altura da logo (ajustada pela escala de quem usa, para dar 88 px na arte). */
  logoClassName?: string;
}

export function WeightComparisonCard({ comparison, volume, unit, caption, logoClassName }: WeightComparisonCardProps) {
  return (
    <div className="flex w-[600px] flex-col items-center gap-[8px] overflow-hidden rounded-[48px] border-[3px] border-border-strong bg-surface px-[44px] py-[40px] text-center">
      <Logo className={cn("h-[84px]", logoClassName)} />
      <div className="relative mt-[8px] h-[492px] w-[512px]">
        <div className="absolute top-[40px] left-[56px] size-[400px] rounded-full bg-comparison-halo" />
        <div className="absolute top-[458px] left-[146px] h-[24px] w-[220px] rounded-full bg-surface-3" />
        <WeightObject kind={comparison.kind} label={comparison.name} className="absolute top-0 left-[36px] block h-[236px] w-[440px] overflow-visible" />
        <div className="absolute top-[196px] left-[116px]">
          <GufRat occasion={RAT_BY_EFFORT[comparison.effort]} size={280} animated={false} label={null} />
        </div>
      </div>
      <span className="text-[30px] font-bold tracking-[.08em] text-fg">ACABEI DE LEVANTAR</span>
      <div className="flex items-baseline gap-[10px]">
        <span className="font-display text-[120px] leading-[108px] font-bold text-accent-text">{volume}</span>
        <span className="font-display text-[52px] font-semibold text-fg">{unit}</span>
      </div>
      <span className="text-[40px] leading-[48px] font-bold tracking-[-.02em] text-balance">{comparison.phrase}</span>
      {caption && <span className="text-[30px] text-fg">{caption}</span>}
      <span className="mt-[16px] text-[28px] font-semibold text-fg">
        {STORY_SIGNATURE_LEAD} <span className="text-accent-text">{STORY_DOMAIN}</span>
      </span>
      <span className="text-[30px] font-bold tracking-[-.01em] text-fg">
        <span className="text-accent-text">GUF</span> te ajudando a evoluir
      </span>
    </div>
  );
}
