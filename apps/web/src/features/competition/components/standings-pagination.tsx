"use client";

import { LocateFixed } from "lucide-react";
import { COMPETITION_PAGE_SIZE, pageOfPosition, paginationSlots, standingsPageCount, standingsPageLabel } from "@guf/core";
import { Icon } from "@/shared/components/ds";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/components/ui/pagination";

interface StandingsPaginationProps {
  page: number;
  total: number;
  /** Pessoas por página (ranking 10, escolha do adversário 5). */
  pageSize?: number;
  /** Sua posição na classificação: mostra o atalho "Ir para a minha posição" (só no ranking). */
  myPosition?: number | null;
  isFetching: boolean;
  onPage: (page: number) => void;
}

/**
 * Páginas de uma lista da competição pedida ao banco (ranking ou escolha do adversário): anterior/
 * próxima, a primeira, a última e as vizinhas da atual e, no ranking, o atalho para a sua página.
 * Some com uma página só.
 */
export function StandingsPagination({ page, total, pageSize = COMPETITION_PAGE_SIZE, myPosition = null, isFetching, onPage }: StandingsPaginationProps) {
  const pages = standingsPageCount(total, pageSize);
  if (pages <= 1) return null;
  const myPage = myPosition ? pageOfPosition(myPosition, pageSize) : null;

  return (
    <div className="flex flex-col items-center gap-2" aria-busy={isFetching || undefined}>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious disabled={page <= 1} onClick={() => onPage(page - 1)} />
          </PaginationItem>
          {paginationSlots(page, pages).map((slot, index) =>
            slot === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={slot}>
                <PaginationLink isActive={slot === page} aria-label={`Página ${slot}`} onClick={() => onPage(slot)}>
                  {slot}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext disabled={page >= pages} onClick={() => onPage(page + 1)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[13px] text-fg-muted">
        <span aria-live="polite" className="tabular-nums">
          {standingsPageLabel(page, total, pageSize)}
        </span>
        {myPage && myPage !== page && (
          <button
            type="button"
            onClick={() => onPage(myPage)}
            className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md px-2 font-semibold text-accent-text hover:bg-surface-3"
          >
            <Icon icon={LocateFixed} size={15} />
            Ir para a minha posição
          </button>
        )}
      </div>
    </div>
  );
}
