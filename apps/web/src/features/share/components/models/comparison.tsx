// Stories · Comparação de peso (Claude Design · Comparacoes de Peso). Arte fixa 1080 × 1920; os dados vêm de StoryData.
import type { StoryModelProps } from "@/features/share/type";
import { WeightComparisonCard } from "@/features/share/components/weight-comparison-card";

/** Cartão de 600 px ampliado 1,5× no meio da arte. */
export function Story39({ d }: StoryModelProps) {
  if (!d.comparison) return null;
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-[1.5]">
      {/* 88 px na arte (59 × 1,5). */}
      <WeightComparisonCard comparison={d.comparison} volume={d.volume} unit={d.unit} caption={d.title} logoClassName="h-[59px]" />
    </div>
  );
}
