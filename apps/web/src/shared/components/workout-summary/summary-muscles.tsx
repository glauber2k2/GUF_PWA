"use client";

import type { MuscleLevels } from "@guf/core";
import { muscleLegend } from "@guf/core";
import { MUSCLE_LEVEL_OPACITY, MuscleFigure } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";

const FIGURE_HEIGHT = 176;

/**
 * Músculos trabalhados no treino: boneco de frente e de costas aceso pelo nível (séries por grupo,
 * proporcional ao mais treinado) e a legenda em texto (o boneco é só ilustração para leitor de tela).
 */
export function SummaryMuscles({ levels }: { levels: MuscleLevels }) {
  const legend = muscleLegend(levels);
  return (
    <section aria-labelledby="summary-muscles" className="flex animate-guf-rise flex-col gap-3 rounded-lg border border-border bg-surface px-4 py-3.5 [animation-delay:120ms]">
      <h2 id="summary-muscles" className="m-0 text-base leading-6 font-semibold">
        Músculos trabalhados
      </h2>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
        <div className="flex gap-2">
          <MuscleFigure view="front" height={FIGURE_HEIGHT} levels={levels} />
          <MuscleFigure view="back" height={FIGURE_HEIGHT} levels={levels} />
        </div>
        <ul aria-label="Grupos do mais ao menos treinado" className="m-0 flex min-w-36 list-none flex-col gap-2 p-0">
          {legend.map((m) => (
            <li key={m.muscle} className="flex items-center gap-2.5 text-sm leading-5">
              <span aria-hidden="true" className={cn("size-3.5 flex-none rounded-[4px] bg-accent-text", MUSCLE_LEVEL_OPACITY[m.level])} />
              {m.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
