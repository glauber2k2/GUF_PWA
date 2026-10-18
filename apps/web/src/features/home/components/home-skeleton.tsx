import { Skeleton } from "@/shared/components/ds";

const CARD = "flex flex-col rounded-lg border border-border bg-surface shadow-e1";
const WEEK = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"];

/** Carregamento da Início: mesma silhueta dos blocos reais. */
export function HomeSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1 pt-4 pb-1">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-7 w-[190px] rounded-sm" />
          <Skeleton className="w-[130px]" />
        </div>
        <Skeleton className="size-11 rounded-pill" />
      </div>
      <div className={`${CARD} gap-3 p-5`}>
        <Skeleton className="h-3 w-[110px]" />
        <Skeleton className="h-6 w-[85%] rounded-sm" />
        <Skeleton className="w-3/5" />
        <div className="flex gap-1.5">
          <Skeleton className="h-6 w-16 rounded-sm" />
          <Skeleton className="h-6 w-14 rounded-sm" />
        </div>
        <Skeleton className="h-10 rounded-[10px]" />
        <Skeleton className="h-10 rounded-[10px]" />
        <Skeleton className="h-14 rounded-md" />
      </div>
      <div className={`${CARD} gap-3.5 px-5 pt-4 pb-5`}>
        <Skeleton className="h-[18px] w-[120px]" />
        <div className="grid grid-cols-7 justify-items-center">
          {WEEK.map((d) => (
            <Skeleton key={d} className="size-9 rounded-pill" />
          ))}
        </div>
      </div>
      <div className={`${CARD} gap-3.5 p-5`}>
        <div className="flex items-center gap-3.5">
          <Skeleton className="size-12 rounded-md" />
          <Skeleton className="h-10 w-[150px] rounded-sm" />
        </div>
        <Skeleton className="h-2 rounded-pill" />
        <Skeleton className="w-[70%]" />
      </div>
    </div>
  );
}
