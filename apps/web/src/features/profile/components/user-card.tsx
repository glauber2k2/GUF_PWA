"use client";

import Link from "next/link";
import { CalendarCheck, Pencil } from "lucide-react";
import { trainingSinceLabel } from "@guf/core";
import type { Profile } from "@guf/api";
import { Avatar, Icon } from "@/shared/components/ds";

interface UserCardProps {
  profile: Profile;
  /** Tela que edita nome, @, foto e bio (Editar perfil); vem da rota. */
  editProfileHref: string;
}

/** Cartão do topo: foto, nome, e-mail, "Treinando desde…" e o atalho para Editar perfil. */
export function UserCard({ profile, editProfileHref }: UserCardProps) {
  return (
    <section aria-label="Seus dados" className="flex flex-none animate-guf-rise flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-e1">
      <div className="flex items-center gap-3.5">
        <Avatar size="lg" tone="accent" src={profile.avatarUrl} name={profile.name} email={profile.email} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[19px] leading-6 font-semibold tracking-[-0.01em]">{profile.name || "Sem nome"}</span>
          {profile.email && <span className="truncate text-sm leading-5 text-fg-secondary">{profile.email}</span>}
        </div>
        <Link
          href={editProfileHref}
          className="flex h-11 flex-none items-center gap-1.5 rounded-md border border-border-strong px-3 text-sm font-semibold text-fg no-underline transition-transform duration-100 ease-standard hover:bg-surface-3 active:scale-[.97] motion-reduce:active:scale-100"
        >
          <Icon icon={Pencil} size={16} />
          Editar perfil
        </Link>
      </div>
      <span className="flex items-center gap-2 border-t border-border pt-3.5 text-sm leading-5 text-fg-secondary tabular-nums">
        <Icon icon={CalendarCheck} size={16} className="text-fg-muted" />
        {trainingSinceLabel(profile.firstTrainedOn, profile.completedSessions)}
      </span>
    </section>
  );
}
