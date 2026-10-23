"use client";

import { useState } from "react";
import type { AdminUserSummary } from "@guf/api/admin";
import type { AccountTarget } from "@/features/people/helpers/account-actions";
import { displayName } from "@/features/people/helpers/people";

export function toAccountTarget(person: Pick<AdminUserSummary, "userId" | "name" | "handle">): AccountTarget {
  return { userId: person.userId, label: `${displayName(person.name, person.handle)}${person.handle ? ` · @${person.handle}` : ""}` };
}

/** Pessoas marcadas para ações em lote. Continua entre buscas: dá para juntar resultados diferentes. */
export function usePeopleSelection() {
  const [targets, setTargets] = useState<AccountTarget[]>([]);
  const selectedIds = targets.map((t) => t.userId);

  const toggle = (person: AdminUserSummary) =>
    setTargets((current) =>
      current.some((t) => t.userId === person.userId) ? current.filter((t) => t.userId !== person.userId) : [...current, toAccountTarget(person)],
    );

  /** Marca todos os resultados visíveis; se já estavam todos marcados, desmarca esses. */
  const toggleAll = (people: AdminUserSummary[]) =>
    setTargets((current) => {
      const allIn = people.every((p) => current.some((t) => t.userId === p.userId));
      if (allIn) return current.filter((t) => !people.some((p) => p.userId === t.userId));
      return [...current, ...people.filter((p) => !current.some((t) => t.userId === p.userId)).map(toAccountTarget)];
    });

  const remove = (userIds: string[]) => setTargets((current) => current.filter((t) => !userIds.includes(t.userId)));

  return { targets, selectedIds, toggle, toggleAll, remove, clear: () => setTargets([]) };
}
