"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { followRequestsPreview, followRequestsTitle } from "@guf/core";
import { Avatar, Icon } from "@/shared/components/ds";
import { useConnections } from "@/features/social/api/use-social";
import { FOLLOW_REQUESTS_PATH } from "@/features/social/helpers/paths";

const PREVIEW_AVATARS = 3;

/** Barra no topo do seu perfil privado com pedidos para seguir pendentes; abre as solicitações. */
export function FollowRequestsBar() {
  const requests = useConnections("requests", null);
  const people = requests.data ?? [];
  if (people.length === 0) return null;

  const title = followRequestsTitle(people.length);
  return (
    <Link
      href={FOLLOW_REQUESTS_PATH}
      aria-label={`Ver ${title}`}
      className="-mb-1 flex animate-guf-rise-fast items-center gap-3 rounded-[14px] border border-accent/40 bg-accent/12 px-3.5 py-3 text-fg no-underline transition-[background-color,transform] duration-150 ease-standard hover:bg-accent/18 active:scale-[.98] motion-reduce:active:scale-100"
    >
      <span className="flex flex-none pl-2.5" aria-hidden="true">
        {people.slice(0, PREVIEW_AVATARS).map((person) => (
          <span key={person.userId} className="-ml-2.5 grid rounded-pill bg-surface p-0.5">
            <Avatar src={person.avatarUrl} name={person.name ?? person.handle} size="sm" className="size-7 text-xs" />
          </span>
        ))}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <strong className="text-sm leading-5">{title}</strong>
        <span className="truncate text-xs leading-4 text-fg-secondary">{followRequestsPreview(people.map((p) => p.handle))}</span>
      </span>
      <span className="grid h-[22px] min-w-[22px] place-items-center rounded-pill bg-accent px-1.5 text-xs font-bold text-accent-foreground tabular-nums">
        {people.length}
      </span>
      <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
    </Link>
  );
}
