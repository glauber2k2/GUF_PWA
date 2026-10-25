"use client";

import type { AdminUserSummary } from "@guf/api/admin";
import { Avatar, cn } from "@guf/ui";
import { displayName } from "@/features/people/helpers/people";
import { personRowProps } from "@/features/people/hooks/use-people-shortcuts";

interface PeopleCompactListProps {
  people: AdminUserSummary[];
  selectedId: string | null;
  onOpen: (userId: string) => void;
}

/** Lista estreita ao lado do detalhe aberto (tablet e computador): só trocar de conta. */
export function PeopleCompactList({ people, selectedId, onOpen }: PeopleCompactListProps) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {people.map((p) => {
        const selected = p.userId === selectedId;
        return (
          <li key={p.userId}>
            <button
              type="button"
              {...personRowProps(p.userId)}
              aria-current={selected || undefined}
              onClick={() => onOpen(p.userId)}
              className={cn(
                "flex min-h-15 w-full cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-3 py-2.5 text-left",
                selected ? "border-accent-text bg-accent/10" : "border-transparent hover:bg-surface",
              )}
            >
              <Avatar name={displayName(p.name, p.handle)} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate">{displayName(p.name, p.handle)}</strong>
                <span className="truncate text-[13px] text-fg-secondary">
                  {p.handle ? `@${p.handle}` : "Sem @"} · {p.planName}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
