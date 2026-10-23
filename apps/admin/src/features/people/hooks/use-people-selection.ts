"use client";

import { useState } from "react";
import type { AdminUserSummary } from "@guf/api/admin";
import { MAX_BULK_SELECTION, type AccountTarget } from "@/features/people/helpers/account-actions";
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
    setPeople((current) => {
      if (has(current, person.userId)) return current.filter((p) => p.userId !== person.userId);
      return current.length < MAX_BULK_SELECTION ? [...current, person] : current;
    });

  /** Marca todos os resultados visíveis; se já estavam todos marcados, desmarca esses. */
  const toggleAll = (visible: AdminUserSummary[]) =>
    setPeople((current) => {
      if (visible.every((p) => has(current, p.userId))) return current.filter((p) => !has(visible, p.userId));
      const room = MAX_BULK_SELECTION - current.length;
      return [...current, ...visible.filter((p) => !has(current, p.userId)).slice(0, Math.max(room, 0))];
    });

  const remove = (userIds: string[]) => setPeople((current) => current.filter((p) => !userIds.includes(p.userId)));

  return {
    people,
    targets: people.map(toAccountTarget),
    selectedIds,
    isFull: people.length >= MAX_BULK_SELECTION,
    toggle,
    toggleAll,
    remove,
    clear: () => setPeople([]),
  };
}
