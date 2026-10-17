import { forwardRef } from "react";
import type { StoryData } from "@guf/core";
import type { StoryModel } from "./story-catalog";

export interface StoryArtProps {
  model: StoryModel;
  data: StoryData;
  /** Opacidade do fundo (0 = PNG transparente, para colar sobre a foto). */
  backgroundOpacity: number;
}

/**
 * Arte do story em tamanho real (1080 × 1920, tema escuro como no design). A folha mostra em escala
 * e a exportação para PNG captura este mesmo elemento.
 */
export const StoryArt = forwardRef<HTMLDivElement, StoryArtProps>(function StoryArt({ model, data, backgroundOpacity }, ref) {
  const o = Math.max(0, Math.min(100, backgroundOpacity));
  // Fundo com a opacidade escolhida (valor dinâmico).
  const background = o >= 100 ? "var(--background)" : o <= 0 ? "transparent" : `color-mix(in oklab, var(--background) ${o}%, transparent)`;
  const { Component } = model;
  return (
    <div
      ref={ref}
      data-theme="dark"
      className="relative h-[1920px] w-[1080px] overflow-hidden font-sans text-fg tabular-nums"
      style={{ background }}
    >
      <Component d={data} />
    </div>
  );
});
