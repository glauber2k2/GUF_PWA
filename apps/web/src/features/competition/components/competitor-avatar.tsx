"use client";

import Link from "next/link";
import { socialInvitePath, type CompetitionParticipant } from "@guf/core";
import { Avatar } from "@/shared/components/ds";
import { withDevState } from "@/shared/helpers/dev-state-path";

type AvatarSize = "sm" | "md" | "lg";

interface CompetitorAvatarProps {
  competitor: Pick<CompetitionParticipant, "handle" | "name" | "avatarUrl" | "isMe">;
  size: AvatarSize;
  className?: string;
}

/**
 * Foto de quem compete: tocar abre o perfil da pessoa (/pessoa?u=@). A sua foto não é link (você já
 * está no seu perfil pela aba Perfil). Fica acima de linhas tocáveis (z-[1]) para não disparar a linha.
 */
export function CompetitorAvatar({ competitor, size, className }: CompetitorAvatarProps) {
  const avatar = <Avatar src={competitor.avatarUrl} name={competitor.name ?? competitor.handle} size={size} className={className} />;
  if (competitor.isMe) return avatar;
  return (
    <Link
      href={withDevState(socialInvitePath(competitor.handle))}
      aria-label={`Ver perfil de ${competitor.name ?? `@${competitor.handle}`}`}
      onClick={(event) => event.stopPropagation()}
      className="relative z-[1] grid flex-none rounded-pill outline-none focus-visible:shadow-focus"
    >
      {avatar}
    </Link>
  );
}
