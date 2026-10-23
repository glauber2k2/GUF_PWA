"use client";

import type { MuscleLevels } from "@guf/core";
import { muscleLegend } from "@guf/core";
import { MuscleFigure } from "@/shared/components/ds";

const FIGURE_HEIGHT = 176;

/**
 * Músculos trabalhados no treino: boneco de frente e de costas aceso pelo nível (séries por grupo,
 * proporcional ao mais treinado) e os nomes, do mais ao menos treinado (o boneco é só ilustração
 * para leitor de tela; sem legenda de cor, que confundia mais do que ajudava).
 */
export function SummaryMuscles({ levels }: { levels: MuscleLevels }) {
  const names = muscleLegend(levels).map((m) => m.label);
  return (
    <section aria-labelledby="summary-muscles" className="flex animate-guf-rise flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 [animation-delay:120ms]">
      <h2 id="summary-muscles" className="m-0 text-base leading-6 font-semibold">
        Músculos trabalhados
      </h2>
      <div className="flex justify-center gap-2">
        <MuscleFigure view="front" height={FIGURE_HEIGHT} levels={levels} />
        <MuscleFigure view="back" height={FIGURE_HEIGHT} levels={levels} />
      </div>
      <p aria-label={`Grupos do mais ao menos treinado: ${names.join(", ")}`} className="m-0 text-center text-sm leading-5 text-pretty text-fg-secondary">
        {names.join(" · ")}
      </p>
    </section>
  );
}
