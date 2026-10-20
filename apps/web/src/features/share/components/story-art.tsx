import { forwardRef, type CSSProperties } from "react";
import type { StoryData } from "@guf/core";
import { cn } from "@/shared/helpers/class-names";
import type { StoryModel } from "@/features/share/constants/story-catalog";
import type { StoryFormat, StoryTheme } from "@/features/share/type";

export interface StoryArtProps {
  model: StoryModel;
  data: StoryData;
  /** Opacidade do fundo (0 = PNG transparente, para colar sobre a foto). Stickers: sempre sem fundo; vale para o adesivo. */
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
 * Opacidade mínima dos cartões quando há conteúdo solto no fundo (logo, títulos, boneco): o cartão
 * continua marcando o bloco sobre a foto e o conjunto fica legível.
 */
const LOOSE_CONTENT_CARD_MIN = 30;
/** Opacidade mínima de um cartão dentro de outro (subcartão): separa os blocos de informação. */
const INNER_CARD_MIN = 20;

/** Opacidade dos cartões (%) para a opacidade escolhida: até 0 só quando tudo está dentro de cartões. */
export function storyCardOpacity(opacity: number, cardsOnly: boolean): number {
  const o = Math.max(0, Math.min(100, opacity));
  if (cardsOnly) return o;
  return Math.round(LOOSE_CONTENT_CARD_MIN + (o * (100 - LOOSE_CONTENT_CARD_MIN)) / 100);
}

/** Opacidade (%) de um cartão dentro de outro: acompanha a escolhida, com mínimo de 20%. */
export function storyInnerCardOpacity(opacity: number): number {
  const o = Math.max(0, Math.min(100, opacity));
  return Math.round(INNER_CARD_MIN + (o * (100 - INNER_CARD_MIN)) / 100);
}

/** Cor da superfície na opacidade dada (100 = a cor; 0 = transparente). */
function surfaceAt(color: string, percent: number): string {
  if (percent >= 100) return color;
  if (percent <= 0) return "transparent";
  return `color-mix(in oklab, ${color} ${percent}%, transparent)`;
}

/**
 * Fundo e cartões pela opacidade (Claude Design · StoryArt): o fundo vai de 0 a 100%. Cartões de fora
 * acompanham até 0 quando todo o conteúdo está dentro deles (`cardsOnly`); senão, de 30 a 100%.
 * Cartões dentro de outro cartão usam as variáveis --story-inner-* (mínimo de 20%), aplicadas pela
 * regra [data-story-art] do base.css.
 */
export function storyArtColors(opacity: number, theme: StoryTheme, cardsOnly = false): CSSProperties {
  const o = Math.max(0, Math.min(100, opacity));
  const background = o >= 100 ? "var(--background)" : o <= 0 ? "transparent" : `color-mix(in oklab, var(--background) ${o}%, transparent)`;
  const card = storyCardOpacity(o, cardsOnly);
  const inner = storyInnerCardOpacity(o);
  const s = SURFACES[theme];
  return {
    background,
    "--surface": surfaceAt(s.surface, card),
    "--surface-elevated": surfaceAt(s.elevated, card),
    "--surface-3": surfaceAt(s.third, card),
    "--story-inner-surface": surfaceAt(s.surface, inner),
    "--story-inner-surface-elevated": surfaceAt(s.elevated, inner),
    "--story-inner-surface-3": surfaceAt(s.third, inner),
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
  // Opacidade escolhida (valores dinâmicos). Sticker: fundo sempre transparente e o adesivo segue a mesma
  // regra dos cartões.
  const cardsOnly = model.cardsOnly ?? false;
  const colors = storyArtColors(backgroundOpacity, theme, cardsOnly);
  if (format === "sticker") colors.background = "transparent";
  // Só cartões e opacidade 0: o cartão de fora some de vez (sem borda nem sombra); só os elementos ficam.
  const flat = cardsOnly && backgroundOpacity <= 0;
  return (
    <div
      ref={ref}
      data-theme={theme}
      data-story-art=""
      data-flat={flat ? "" : undefined}
      className={cn(FORMAT_BOX[format], "font-sans text-fg tabular-nums")}
      style={colors}
    >
      <Component d={data} />
    </div>
  );
});
