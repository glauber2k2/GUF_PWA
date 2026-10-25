"use client";

import { LocateFixed } from "lucide-react";
import { pageOfPosition, paginationSlots, standingsPageCount, standingsPageLabel } from "@guf/core";
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

interface RankingPaginationProps {
  page: number;
  total: number;
  /** Sua posição na classificação (para o atalho "Ir para a minha posição"). */
  myPosition: number | null;
  isFetching: boolean;
  onPage: (page: number) => void;
}

/**
 * Páginas do ranking (10 pessoas cada, pedidas ao banco): anterior/próxima, a primeira, a última e as
 * vizinhas da atual, e o atalho para a página em que você está. Some com uma página só.
 */
export function RankingPagination({ page, total, myPosition, isFetching, onPage }: RankingPaginationProps) {
  const pages = standingsPageCount(total);
  if (pages <= 1) return null;
  const myPage = myPosition ? pageOfPosition(myPosition) : null;

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
          {standingsPageLabel(page, total)}
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
