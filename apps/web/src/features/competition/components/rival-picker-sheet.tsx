"use client";

import { Check, SearchX } from "lucide-react";
import { RIVAL_PAGE_SIZE } from "@guf/core";
import type { StandingsQuery } from "@guf/api";
import { Avatar, Banner, BottomSheet, EmptyState, Icon, SearchField, Skeleton } from "@/shared/components/ds";
import { cn } from "@/shared/helpers/class-names";
import { StandingsPagination } from "@/features/competition/components/standings-pagination";
import { useRivalPicker } from "@/features/competition/hooks/use-rival-picker";

interface RivalPickerSheetProps {
  open: boolean;
  /** Período e métrica da tela (a ordem da lista é a da classificação). */
  query: StandingsQuery;
  rivalId: string | null;
  onPick: (userId: string) => void;
  onClose: () => void;
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando pessoas" className="flex flex-col gap-1.5">
      {Array.from({ length: RIVAL_PAGE_SIZE }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-md" />
      ))}
    </div>
  );
}

/**
 * Escolher com quem duelar: busca por nome ou @ e páginas de 5, feitas no banco (funciona com
 * milhares de competidores). Tocar numa pessoa troca o adversário e fecha.
 */
export function RivalPickerSheet({ open, query, rivalId, onPick, onClose }: RivalPickerSheetProps) {
  const picker = useRivalPicker(query, open);
  const { results } = picker;
  const items = results.data?.items ?? [];
  const total = results.data?.total ?? 0;

  const pick = (userId: string) => {
    onPick(userId);
    onClose();
  };

  return (
    <BottomSheet placement="screen" open={open} onClose={onClose} title="Duelar com" className="max-h-[90dvh] overflow-y-auto">
      <div className="flex flex-col gap-3">
        <SearchField
          aria-label="Buscar competidor por nome ou @"
          placeholder="Buscar por nome ou @"
          value={picker.search}
          onChange={(e) => picker.setSearch(e.target.value)}
          enterKeyHint="search"
          autoComplete="off"
        />

        {results.isPending ? (
          <ResultsSkeleton />
        ) : results.isError ? (
          <Banner tone="danger" actionLabel="Tentar" onAction={() => void results.refetch()}>
            {results.error.message}
          </Banner>
        ) : items.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={picker.appliedSearch ? `Ninguém encontrado para “${picker.appliedSearch}”` : "Ninguém para duelar ainda"}
            message={picker.appliedSearch ? "Confira a grafia ou busque pelo @." : "Siga alguém que também siga você para competir."}
            actionLabel={picker.appliedSearch ? "Limpar busca" : undefined}
            onAction={picker.appliedSearch ? picker.clearSearch : undefined}
          />
        ) : (
          <div
            role="radiogroup"
            aria-label="Escolher adversário"
            aria-busy={results.isFetching || picker.isTyping || undefined}
            className={cn("flex flex-col gap-1.5 transition-opacity", (results.isFetching || picker.isTyping) && "opacity-60")}
          >
            {items.map((c) => {
              const on = c.userId === rivalId;
              return (
                <button
                  key={c.userId}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => pick(c.userId)}
                  className={cn(
                    "flex min-h-16 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-fg active:scale-[0.98]",
                    on ? "border-[1.5px] border-data bg-surface-elevated" : "border border-border",
                  )}
                >
                  <span className="w-[26px] flex-none text-center font-display text-lg font-bold text-fg-muted tabular-nums">{c.rank}</span>
                  <Avatar src={c.avatarUrl} name={c.name ?? c.handle} size="md" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] leading-5 font-semibold">{c.name ?? `@${c.handle}`}</span>
                    {c.name && <span className="truncate text-[13px] leading-[18px] text-fg-muted">@{c.handle}</span>}
                  </span>
                  <span className={cn("grid size-6 flex-none place-items-center rounded-pill", on ? "bg-data text-accent-foreground" : "border-[1.5px] border-border-strong")}>
                    {on && <Icon icon={Check} size={14} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <StandingsPagination page={picker.page} total={total} pageSize={RIVAL_PAGE_SIZE} isFetching={results.isFetching} onPage={picker.goToPage} />
      </div>
    </BottomSheet>
  );
}
