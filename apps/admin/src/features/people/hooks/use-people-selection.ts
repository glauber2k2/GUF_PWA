"use client";

import { useState } from "react";
import type { AdminUserSummary } from "@guf/api/admin";
import type { AccountTarget } from "@/features/people/helpers/account-actions";
import { displayName } from "@/features/people/helpers/people";

export function toAccountTarget(person: Pick<AdminUserSummary, "userId" | "name" | "handle">): AccountTarget {
  return { userId: person.userId, label: `${displayName(person.name, person.handle)}${person.handle ? ` · @${person.handle}` : ""}` };
}

/**
 * Pessoas marcadas para ações em lote. Guarda o resumo de cada uma: continua entre buscas (dá para
 * juntar resultados diferentes) e a lista das selecionadas aparece com a busca vazia.
 */
export function usePeopleSelection() {
  const [people, setPeople] = useState<AdminUserSummary[]>([]);
  const selectedIds = people.map((p) => p.userId);
  const has = (list: AdminUserSummary[], userId: string) => list.some((p) => p.userId === userId);

  const toggle = (person: AdminUserSummary) =>
    setPeople((current) => (has(current, person.userId) ? current.filter((p) => p.userId !== person.userId) : [...current, person]));

  /** Marca todos os resultados visíveis; se já estavam todos marcados, desmarca esses. */
  const toggleAll = (visible: AdminUserSummary[]) =>
    setPeople((current) => {
      if (visible.every((p) => has(current, p.userId))) return current.filter((p) => !has(visible, p.userId));
      return [...current, ...visible.filter((p) => !has(current, p.userId))];
    });

  const remove = (userIds: string[]) => setPeople((current) => current.filter((p) => !userIds.includes(p.userId)));

  return { people, targets: people.map(toAccountTarget), selectedIds, toggle, toggleAll, remove, clear: () => setPeople([]) };
}
