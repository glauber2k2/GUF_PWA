"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { socialInvitePath } from "@guf/core";
import type { PersonCard } from "@guf/api";
import { Avatar, Icon } from "@/shared/components/ds";

/** Linha de uma pessoa (busca e listas): foto, nome e @ levam ao perfil; ações à direita. */
export function PersonRow({ person, locked = false, subtitle, children }: { person: PersonCard; locked?: boolean; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-surface py-2 pr-3 pl-2.5">
      <Link href={socialInvitePath(person.handle)} className="flex min-w-0 flex-1 items-center gap-3 text-fg no-underline">
        <Avatar src={person.avatarUrl} name={person.name ?? person.handle} size="md" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] leading-5 font-semibold">{person.name ?? `@${person.handle}`}</span>
          <span className="flex min-w-0 items-center gap-1 text-[13px] leading-[18px] text-fg-muted">
            <span className="truncate">@{person.handle}</span>
            {locked && <Icon icon={Lock} size={12} label="Perfil privado" className="flex-none" />}
            {subtitle && <span className="truncate">· {subtitle}</span>}
          </span>
        </span>
      </Link>
      {children}
    </div>
  );
}
