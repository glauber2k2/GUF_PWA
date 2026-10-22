"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, ChevronsUpDown, Crown, Lock } from "lucide-react";
import type { AdminUserSummary } from "@guf/api/admin";
import { Avatar, cn, Icon, Tag } from "@guf/ui";
import { displayName, formatDate } from "@/features/people/helpers/people";
import type { Device } from "@/shared/hooks/use-device";

type SortKey = "name" | "plan" | "created";
type SortDir = "asc" | "desc";

const SORT_VALUE: Record<SortKey, (p: AdminUserSummary) => string> = {
  name: (p) => displayName(p.name, p.handle).toLowerCase(),
  plan: (p) => p.planName,
  created: (p) => p.createdAt,
};

function sortPeople(people: AdminUserSummary[], key: SortKey, dir: SortDir): AdminUserSummary[] {
  const value = SORT_VALUE[key];
  return [...people].sort((a, b) => value(a).localeCompare(value(b)) * (dir === "asc" ? 1 : -1));
}

function PlanTag({ person }: { person: AdminUserSummary }) {
  return (
    <Tag size="sm" icon={person.isDefaultPlan ? undefined : Crown}>
      {person.planName}
    </Tag>
  );
}

function PrivateIcon() {
  return <Icon icon={Lock} size={13} label="Perfil privado" className="text-fg-muted" />;
}

interface PeopleResultsProps {
  people: AdminUserSummary[];
  device: Device;
  onOpen: (userId: string) => void;
}

/** 3a–3c · Resultados: cartões no celular; tabela ordenável no tablet e no computador. */
export function PeopleResults({ people, device, onOpen }: PeopleResultsProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "name", dir: "asc" });
  const sorted = sortPeople(people, sort.key, sort.dir);
  const toggleSort = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  if (device === "mobile") {
    return (
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {sorted.map((p) => (
          <li key={p.userId}>
            <button
              type="button"
              onClick={() => onOpen(p.userId)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border bg-surface p-3.5 text-left active:scale-[.98]"
            >
              <Avatar name={displayName(p.name, p.handle)} size="md" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-1.5">
                  <strong className="truncate text-[15px]">{displayName(p.name, p.handle)}</strong>
                  {p.isPrivate && <PrivateIcon />}
                </span>
                <span className="text-[13px] text-fg-secondary">
                  {p.handle ? `@${p.handle}` : "Sem @"} · criada em {formatDate(p.createdAt)}
                </span>
                <span className="flex">
                  <PlanTag person={p} />
                </span>
              </span>
              <Icon icon={ChevronRight} size={18} className="text-fg-muted" />
            </button>
          </li>
        ))}
      </ul>
    );
  }

  const columns: Array<{ key?: SortKey; label: string; desktopOnly?: boolean }> = [
    { key: "name", label: "Pessoa" },
    { key: "plan", label: "Plano" },
    { key: "created", label: "Criada em" },
    { label: "E-mail", desktopOnly: true },
    { label: "Id", desktopOnly: true },
  ];
  const visible = columns.filter((c) => !c.desktopOnly || device === "desktop");

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-[1]">
          <tr className="bg-surface-elevated">
            {visible.map((c) => {
              const active = c.key === sort.key;
              return (
                <th
                  key={c.label}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  className="h-11 border-b border-border px-4 text-left text-overline font-semibold tracking-[.08em] whitespace-nowrap text-fg-muted uppercase"
                >
                  {c.key ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key as SortKey)}
                      className={cn("inline-flex h-11 cursor-pointer items-center gap-1.5 uppercase", active && "text-fg")}
                    >
                      {c.label}
                      <Icon icon={active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown} size={13} />
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
            <th scope="col" className="w-11 border-b border-border">
              <span className="sr-only">Abrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr
              key={p.userId}
              onClick={() => onOpen(p.userId)}
              className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface-elevated"
            >
              <td className="px-4 py-2.5">
                <span className="flex items-center gap-3">
                  <Avatar name={displayName(p.name, p.handle)} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpen(p.userId);
                        }}
                        className="cursor-pointer text-left font-semibold whitespace-nowrap"
                      >
                        {displayName(p.name, p.handle)}
                      </button>
                      {p.isPrivate && <PrivateIcon />}
                    </span>
                    <span className="text-[13px] text-fg-secondary">{p.handle ? `@${p.handle}` : "Sem @"}</span>
                  </span>
                </span>
              </td>
              <td className="px-4 py-2.5">
                <PlanTag person={p} />
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap text-fg-secondary tabular-nums">{formatDate(p.createdAt)}</td>
              {device === "desktop" && <td className="px-4 py-2.5 text-fg-secondary">{p.maskedEmail ?? "—"}</td>}
              {device === "desktop" && <td className="max-w-40 truncate px-4 py-2.5 font-display text-[15px] tracking-[.02em] text-fg-muted">{p.userId}</td>}
              <td className="px-2 py-2.5 text-fg-muted">
                <Icon icon={ChevronRight} size={18} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
