"use client";

import { ChevronLeft, Ellipsis } from "lucide-react";
import { IconButton, Skeleton } from "@/shared/components/ds";
import { useScrolled } from "@/shared/hooks/use-scrolled";
import { cn } from "@/shared/helpers/class-names";

export interface DetailHeaderProps {
  title?: string;
  /** Linha pequena em caixa alta acima do título (ex.: projeto ou "Treino livre"). */
  overline?: string | null;
  subtitle?: string | null;
  /** Posição entre os treinos do dia ("1/2"), discreta abaixo do título; só aparece com 2 ou mais. */
  position?: { index: number; total: number } | null;
  loading?: boolean;
  onBack: () => void;
  /** Menu de três pontos (ex.: "Excluir treino"). */
  menuLabel?: string;
  onMenu?: () => void;
}

/** Cabeçalho fixo das telas internas (resumo, evolução, busca): voltar, título centralizado e menu. */
export function DetailHeader({ title, overline, subtitle, position, loading = false, onBack, menuLabel, onMenu }: DetailHeaderProps) {
  const scrolled = useScrolled(8);
  return (
    <header
      className={cn(
        "sticky top-0 z-[5] -mx-4 border-b bg-background/88 pt-[env(safe-area-inset-top)] backdrop-blur-[10px] transition-[border-color] duration-200 ease-standard",
        scrolled ? "border-border" : "border-transparent",
      )}
    >
      <div className="grid h-14 grid-cols-[52px_minmax(0,1fr)_52px] items-center">
        <div className="flex pl-1">
          <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={onBack} />
        </div>
        <div className="flex min-w-0 flex-col items-center text-center">
          {loading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Skeleton className="h-2.5 w-[90px]" />
              <Skeleton className="h-4 w-[180px]" />
            </div>
          ) : (
            <>
              {overline && <span className="max-w-full truncate text-[11px] leading-4 font-semibold tracking-[0.08em] text-fg-muted uppercase">{overline}</span>}
              <h1 className="m-0 max-w-full truncate text-base leading-[21px] font-semibold">{title}</h1>
              {subtitle && <span className="max-w-full truncate text-xs leading-4 text-fg-secondary">{subtitle}</span>}
              {position && position.total > 1 && (
                <span aria-label={`Treino ${position.index} de ${position.total} do dia`} className="text-[11px] leading-4 font-medium text-fg-muted tabular-nums">
                  {position.index}/{position.total}
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex justify-end pr-1">
          {onMenu && <IconButton icon={Ellipsis} label={menuLabel ?? "Mais opções"} variant="ghost" onClick={onMenu} />}
        </div>
      </div>
    </header>
  );
}
