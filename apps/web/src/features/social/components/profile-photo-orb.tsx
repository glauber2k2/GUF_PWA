"use client";

import { useState } from "react";
import Image from "next/image";
import { avatarInitial } from "@guf/core";
import { cn } from "@/shared/helpers/class-names";
import type { RingPhase } from "@/features/social/hooks/use-ring-phase";

/** Abertura do anel parado (graus) e raio do anel no viewBox 48 × 48. */
const RING_GAP_DEG = 50;
const RING_RADIUS = 22;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
const RING_DASH = `${RING_LENGTH * (1 - RING_GAP_DEG / 360) - 3} ${RING_LENGTH}`;
/** Ponto na ponta do arco, logo depois da abertura. */
const DOT_ANGLE = ((-90 + RING_GAP_DEG / 2) * Math.PI) / 180 - (RING_GAP_DEG * Math.PI) / 360;
const DOT_X = 24 + RING_RADIUS * Math.cos(DOT_ANGLE);
const DOT_Y = 24 + RING_RADIUS * Math.sin(DOT_ANGLE);
/** Inicial ocupa 44% do círculo. */
const INITIAL_SCALE = 0.44;

export interface ProfilePhotoOrbProps {
  src: string | null;
  name: string;
  phase: RingPhase;
  /** 0 = área da foto aberta, 1 = recolhida (o anel some). */
  progress: number;
  sizePx: number;
}

/** Foto (ou inicial) com o anel volt: gira devagar parado, se desenha ao enviar e pulsa ao terminar. */
export function ProfilePhotoOrb({ src, name, phase, progress, sizePx }: ProfilePhotoOrbProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src) && failedSrc !== src;
  const isIdle = phase === "idle";

  return (
    <span aria-hidden="true" className={cn("absolute inset-0 block", phase === "done" && "animate-guf-profile-pop")}>
      <svg viewBox="0 0 48 48" className="pointer-events-none absolute -inset-[9%] size-[118%] overflow-visible">
        <g
          className="origin-[24px_24px] transition-[opacity,scale] duration-[380ms] ease-standard"
          // Some e encolhe conforme a área recolhe (valor contínuo).
          style={{ opacity: isIdle ? 1 - progress : 0, scale: 1 - progress * 0.08 }}
        >
          <g className={cn("origin-[24px_24px]", isIdle && "animate-guf-profile-spin")}>
            <circle
              cx={24}
              cy={24}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeDasharray={RING_DASH}
              transform={`rotate(${-90 + RING_GAP_DEG / 2 + 1.5} 24 24)`}
              className="stroke-accent"
            />
            <circle
              cx={DOT_X}
              cy={DOT_Y}
              r={1.5}
              className={cn("origin-center fill-accent [transform-box:fill-box]", isIdle && "animate-guf-profile-breathe")}
            />
          </g>
        </g>
        {!isIdle && (
          <circle
            cx={24}
            cy={24}
            r={RING_RADIUS}
            fill="none"
            strokeWidth={1.8}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            transform="rotate(-90 24 24)"
            className="animate-guf-profile-draw stroke-accent"
          />
        )}
      </svg>
      <span className="absolute inset-0 grid place-items-center overflow-hidden rounded-pill border border-border bg-surface-elevated">
        <span className="absolute inset-0 bg-accent/14" />
        {showPhoto && src ? (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes="124px"
            unoptimized
            // Fotos do Google recusam pedidos com referer de outros sites.
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(src)}
            className={cn(
              "animate-guf-profile-reveal object-cover transition-[filter] duration-[400ms] ease-standard",
              phase === "fill" && "brightness-[.8] saturate-[.6]",
            )}
          />
        ) : (
          <span
            key={name}
            className="relative animate-guf-profile-reveal font-display leading-none font-bold text-accent-text transition-[font-size] duration-[380ms] ease-standard"
            // Tamanho da inicial acompanha o círculo (valor contínuo).
            style={{ fontSize: Math.round(sizePx * INITIAL_SCALE) }}
          >
            {avatarInitial(name, null)}
          </span>
        )}
      </span>
    </span>
  );
}
