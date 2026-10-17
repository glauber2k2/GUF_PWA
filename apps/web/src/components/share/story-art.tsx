import { forwardRef, type CSSProperties } from "react";
import type { StoryData } from "@guf/core";
import { cn } from "@/lib/utils";
import type { StoryModel } from "./story-catalog";
import type { StoryFormat, StoryTheme } from "./story-types";

export interface StoryArtProps {
  model: StoryModel;
  data: StoryData;
  /** Opacidade do fundo (0 = PNG transparente, para colar sobre a foto). Stickers são sempre sem fundo. */
  backgroundOpacity: number;
  /** Tema da imagem (escolhido na folha; independe do tema do app). */
  theme: StoryTheme;
}

/** Superfícies de cada tema (cartões da arte). */
const SURFACES: Record<StoryTheme, { surface: string; elevated: string; third: string }> = {
  dark: { surface: "var(--ink-900)", elevated: "var(--ink-850)", third: "var(--ink-800)" },
  light: { surface: "var(--paper-0)", elevated: "var(--paper-0)", third: "var(--paper-100)" },
};

/**
 * Fundo e cartões pela opacidade (Claude Design · StoryArt): o fundo vai de 0 a 100% e os cartões
 * acompanham de 20 a 100%, para continuarem legíveis sobre a foto.
 */
export function storyArtColors(opacity: number, theme: StoryTheme): CSSProperties {
  const o = Math.max(0, Math.min(100, opacity));
  const background = o >= 100 ? "var(--background)" : o <= 0 ? "transparent" : `color-mix(in oklab, var(--background) ${o}%, transparent)`;
  const card = Math.round(20 + o * 0.8);
  const mix = (color: string) => (card >= 100 ? color : `color-mix(in oklab, ${color} ${card}%, transparent)`);
  const s = SURFACES[theme];
  return {
    background,
    "--surface": mix(s.surface),
    "--surface-elevated": mix(s.elevated),
    "--surface-3": mix(s.third),
  } as CSSProperties;
}

/** Caixa de cada formato (o sticker se ajusta ao conteúdo, com folga para a sombra). */
const FORMAT_BOX: Record<StoryFormat, string> = {
  story: "relative h-[1920px] w-[1080px] overflow-hidden",
  feed: "relative h-[1350px] w-[1080px] overflow-hidden",
  sticker: "inline-block p-[32px]",
};

/**
 * Arte em tamanho real. A folha mostra em escala e a exportação para PNG captura este mesmo elemento.
 */
export const StoryArt = forwardRef<HTMLDivElement, StoryArtProps>(function StoryArt({ model, data, backgroundOpacity, theme }, ref) {
  const { Component } = model;
  const format = model.format ?? "story";
  // Sticker: forma sólida sobre fundo transparente; os outros seguem a opacidade escolhida (valores dinâmicos).
  const colors = format === "sticker" ? { ...storyArtColors(100, theme), background: "transparent" } : storyArtColors(backgroundOpacity, theme);
  return (
    <div ref={ref} data-theme={theme} className={cn(FORMAT_BOX[format], "font-sans text-fg tabular-nums")} style={colors}>
      <Component d={data} />
    </div>
  );
});
