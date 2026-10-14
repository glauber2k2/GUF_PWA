"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

/*
 * StreakFlame — símbolo da sequência (Claude Design · "Streak Chama", chama sólida).
 * Grade 48, cor por currentColor; o núcleo é vazado por máscara (funciona em qualquer fundo).
 * Ativo: text-accent-text · sem sequência: text-fg-muted · sobre volt: text-accent-foreground.
 * Mínimo 16px. Uso isolado exige `label` (ex.: "Sequência de 12 semanas").
 *
 * Animações (keyframes guf-streak-* em base.css; eventos rodam uma vez):
 * ignite (A1, sequência começa) · flicker (A2, loop: ativa e semana pendente) · bump (A3, +1)
 * milestone (A4, marco: brilho + anel) · out (A5, sequência quebrada: encolhe e fica cinza).
 * Movimento reduzido: a regra global leva direto ao estado final.
 */

const OUTER = "M24 4C31 12 38 19 38 29A14 14 0 0 1 10 29C10 22 14 17 18 13C18.5 18 20.5 21 23 22C22 16 21.5 10 24 4Z";
const CORE = "M24 24C28 27.5 30.5 30 30.5 33.5A6.5 6.5 0 0 1 17.5 33.5C17.5 30 20 27.5 24 24Z";

export type StreakFlameAnimation = "none" | "ignite" | "flicker" | "bump" | "milestone" | "out";

const FLAME_ANIMATION: Record<StreakFlameAnimation, { outer?: string; core?: string; svg?: string }> = {
  none: {},
  ignite: { outer: "animate-guf-streak-ignite", core: "animate-guf-streak-core-pop" },
  flicker: { outer: "animate-guf-streak-flicker", core: "animate-guf-streak-core-flick" },
  bump: { outer: "animate-guf-streak-bump" },
  milestone: { outer: "animate-guf-streak-milestone", svg: "animate-guf-streak-glow" },
  out: { outer: "animate-guf-streak-out", core: "animate-guf-streak-core-out", svg: "animate-guf-streak-out-color" },
};

export function StreakFlame({
  size = 24,
  animate = "none",
  label,
  className,
}: {
  size?: number;
  animate?: StreakFlameAnimation;
  /** Nome acessível quando o símbolo aparece sozinho; ao lado do número, deixe vazio. */
  label?: string;
  className?: string;
}) {
  const maskId = `guf-streak-core-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const anim = FLAME_ANIMATION[animate];

  const svg = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="currentColor"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn("shrink-0 overflow-visible", anim.svg, animate !== "milestone" && className)}
    >
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48">
        <rect width="48" height="48" fill="#fff" />
        <path d={CORE} fill="#000" className={cn("origin-[24px_36px] [transform-box:view-box]", anim.core)} />
      </mask>
      <g className={cn("origin-[24px_43px] [transform-box:view-box]", anim.outer)}>
        <path d={OUTER} mask={`url(#${maskId})`} />
      </g>
    </svg>
  );

  if (animate !== "milestone") return svg;

  // Marco: anel que se expande a partir da chama (fica por trás e some no fim).
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-[8%] animate-guf-streak-ring rounded-full border-2 border-current guf-motion-hide"
      />
      {svg}
    </span>
  );
}
