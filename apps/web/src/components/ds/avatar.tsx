"use client";

import { useState } from "react";
import Image from "next/image";
import { avatarInitial } from "@guf/core";
import { cn } from "@/lib/utils";

const AVATAR_SIZES = {
  sm: { box: "size-9", text: "text-sm", px: 36 },
  md: { box: "size-11", text: "text-base", px: 44 },
  lg: { box: "size-16", text: "text-[32px]", px: 64 },
} as const;

const AVATAR_TONES = {
  /** Inicial em volt (cartão do Perfil). */
  accent: "bg-accent font-display font-bold text-accent-foreground",
  /** Inicial discreta com contorno (cabeçalho da Início). */
  neutral: "border border-border-strong bg-surface-3 font-semibold text-fg",
} as const;

export interface AvatarProps {
  /** URL da foto (enviada ou do Google); sem foto, mostra a inicial. */
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: keyof typeof AVATAR_SIZES;
  tone?: keyof typeof AVATAR_TONES;
  className?: string;
}

/**
 * Foto do usuário com a inicial como reserva: a inicial fica por baixo enquanto a foto carrega
 * e volta se a foto falhar (sem internet, link expirado). Decorativa: o nome aparece ao lado ou no rótulo do botão.
 */
export function Avatar({ src, name, email, size = "md", tone = "neutral", className }: AvatarProps) {
  const s = AVATAR_SIZES[size];
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showPhoto = Boolean(src) && failedSrc !== src;
  return (
    <span
      aria-hidden="true"
      className={cn("relative grid flex-none place-items-center overflow-hidden rounded-pill", s.box, s.text, AVATAR_TONES[tone], className)}
    >
      {avatarInitial(name, email)}
      {showPhoto && src && (
        <Image
          src={src}
          alt=""
          width={s.px}
          height={s.px}
          unoptimized
          // Fotos do Google recusam pedidos com referer de outros sites.
          referrerPolicy="no-referrer"
          onError={() => setFailedSrc(src)}
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
}
