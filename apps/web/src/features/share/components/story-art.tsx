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

/** Superfícies e bordas de cada tema (cartões da arte), nos valores de base dos tokens. */
const SURFACES: Record<StoryTheme, { surface: string; elevated: string; third: string; border: string; borderStrong: string }> = {
  dark: { surface: "var(--ink-900)", elevated: "var(--ink-850)", third: "var(--ink-800)", border: "var(--ink-750)", borderStrong: "var(--ink-700)" },
  light: { surface: "var(--paper-0)", elevated: "var(--paper-0)", third: "var(--paper-100)", border: "var(--paper-200)", borderStrong: "var(--paper-300)" },
};

/** Cor na opacidade dada (100 = a cor; 0 = transparente). */
function colorAt(color: string, percent: number): string {
  if (percent >= 100) return color;
  if (percent <= 0) return "transparent";
  return `color-mix(in oklab, ${color} ${percent}%, transparent)`;
}

/**
 * Fundo, cartões e bordas pela opacidade escolhida (Claude Design · StoryArt), de 0 a 100% em todos
 * os modelos, inclusive cartões dentro de outros: em 0% tudo fica transparente e só os elementos
 * aparecem (a regra [data-story-art][data-flat] do base.css tira também bordas coloridas e sombras).
 */
export function storyArtColors(opacity: number, theme: StoryTheme): CSSProperties {
  const o = Math.max(0, Math.min(100, opacity));
  const s = SURFACES[theme];
  return {
    background: colorAt("var(--background)", o),
    "--surface": colorAt(s.surface, o),
    "--surface-elevated": colorAt(s.elevated, o),
    "--surface-3": colorAt(s.third, o),
    "--border": colorAt(s.border, o),
    "--border-strong": colorAt(s.borderStrong, o),
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
  const colors = storyArtColors(backgroundOpacity, theme);
  if (format === "sticker") colors.background = "transparent";
  // Opacidade 0: nenhum cartão aparece (nem borda colorida nem sombra); só os elementos ficam.
  const flat = backgroundOpacity <= 0;
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
