"use client";

import { useState } from "react";
import { Check, Plus, Search } from "lucide-react";
import { Avatar, cn, Icon } from "@guf/ui";
import { displayName } from "@/shared/helpers/display-name";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { MIN_PEOPLE_QUERY_LENGTH, useSearchPeople } from "@/shared/hooks/use-search-people";

interface PersonPickerProps {
  /** Ids já na lista (aparecem como "Na lista" e não entram de novo). */
  selectedIds: string[];
  onAdd: (userId: string) => void;
}

/** Busca por @, nome, e-mail exato ou id e adiciona a pessoa à lista de ids do comunicado. */
export function PersonPicker({ selectedIds, onAdd }: PersonPickerProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 300);
  const search = useSearchPeople(debounced);
  const results = debounced.length >= MIN_PEOPLE_QUERY_LENGTH ? (search.data ?? []) : [];

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="announcement-person-search" className="text-[13px] font-semibold text-fg-secondary">
        Adicionar pessoas
      </label>
      <div className="relative flex items-center">
        <Icon icon={Search} size={18} className="pointer-events-none absolute left-3.5 text-fg-muted" />
        <input
          id="announcement-person-search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="@, nome, e-mail ou id"
          className="h-11 w-full rounded-md border border-border-strong bg-surface-3 pr-3.5 pl-10 text-fg outline-none placeholder:text-fg-muted focus:border-focus focus:shadow-focus"
        />
      </div>
      {search.isError && <span className="text-[13px] text-danger">{search.error.message}</span>}
      {debounced.length >= MIN_PEOPLE_QUERY_LENGTH && !search.isFetching && results.length === 0 && !search.isError && (
        <span className="text-[13px] text-fg-muted">Ninguém encontrado para “{debounced}”.</span>
      )}
      {results.length > 0 && (
        <ul aria-label="Resultados" className="m-0 flex max-h-64 list-none flex-col overflow-auto rounded-md border border-border p-1">
          {results.map((p) => {
            const added = selectedIds.includes(p.userId);
            const name = displayName(p.name, p.handle);
            return (
              <li key={p.userId}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => onAdd(p.userId)}
                  className={cn("flex min-h-12 w-full items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left", added ? "cursor-default" : "cursor-pointer hover:bg-surface-3")}
                >
                  <Avatar name={name} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-sm">{name}</strong>
                    <span className="truncate text-[12.5px] text-fg-secondary">{p.handle ? `@${p.handle}` : "Sem @"}</span>
                  </span>
                  <span className={cn("inline-flex items-center gap-1 text-[13px] font-semibold", added ? "text-success" : "text-accent-text")}>
                    <Icon icon={added ? Check : Plus} size={15} />
                    {added ? "Na lista" : "Adicionar"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
