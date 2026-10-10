import { Skeleton } from "@/components/ds";

const CARD = "flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-5";
const CALENDAR_CELLS = 35;

/** Carregamento do Histórico: mesma silhueta dos três blocos (sequência, calendário e gráfico). */
export function HistorySkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando histórico" className="flex flex-col gap-4">
      <div className={CARD}>
        <div className="flex items-center gap-3.5">
          <Skeleton className="size-[52px] rounded-md" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[34px] w-[150px] rounded-sm" />
            <Skeleton className="h-3 w-[110px]" />
          </div>
        </div>
        <Skeleton className="h-[22px]" />
        <Skeleton className="w-[70%]" />
      </div>
      <div className={CARD}>
        <Skeleton className="h-5 w-[140px]" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: CALENDAR_CELLS }, (_, i) => (
            <Skeleton key={i} className="h-9 rounded-pill" />
          ))}
        </div>
      </div>
      <div className={CARD}>
        <Skeleton className="h-[18px] w-[220px]" />
        <Skeleton className="h-10 rounded-pill" />
        <Skeleton className="h-40 rounded-md" />
      </div>
    </div>
  );
}
