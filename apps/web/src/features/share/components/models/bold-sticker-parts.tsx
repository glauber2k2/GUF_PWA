// Partes comuns dos stickers do canvas "PNGs Competicao e Cardio" (Claude Design): cartão de 960 px,
// cabeçalho com a logo, rótulo em caixa alta e o texto em eco.
import type { ReactNode } from "react";
import { cn } from "@/shared/helpers/class-names";
import { StickerLogo } from "./stickers-a";

/** Cartão padrão dos stickers deste canvas (960 px, cantos de 56 px). */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("box-border flex w-[960px] flex-col rounded-[56px] border-2 border-border bg-surface p-[64px] text-fg", className)}>{children}</div>;
}

export function Header({ aside }: { aside: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <StickerLogo />
      {aside}
    </div>
  );
}

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("text-[32px] font-semibold tracking-[.08em] text-fg-secondary", className)}>{children}</span>;
}

/** Palavras do eco (competição e cardio): repetidas, a última acesa; cada linha anda um pouco para a direita. */
export function EchoLines({ words, size }: { words: readonly string[]; size: "competition" | "cardio" }) {
  return words.map((word, i) => {
    const isLast = i === words.length - 1;
    return (
      <span
        key={i}
        className={cn(
          "block font-display font-bold tracking-[-.02em] whitespace-nowrap",
          size === "competition" ? "text-[170px] leading-[140px]" : "text-[150px] leading-[130px]",
          isLast ? "text-accent-text" : "text-fg",
        )}
        // Inclinação, deslocamento e opacidade de cada linha (valores dinâmicos).
        style={{ transform: `skewX(${size === "competition" ? -10 : -12}deg) translateX(${i * 36}px)`, opacity: isLast ? 1 : 0.25 + i * 0.15 }}
      >
        {word}
      </span>
    );
  });
}
