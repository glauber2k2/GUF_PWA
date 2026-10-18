import { Skeleton } from "@/shared/components/ds";

/** Carregando a evolução: recordes, gráfico e últimos treinos. */
export function EvolutionSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando evolução" className="flex flex-col gap-4">
      <Skeleton className="h-3 w-[140px]" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((k) => (
          <Skeleton key={k} className="h-[104px] rounded-lg" />
        ))}
      </div>
      <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface px-4 py-5">
        <Skeleton className="h-10 rounded-pill" />
        <Skeleton className="h-10 w-[140px] rounded-[8px]" />
        <Skeleton className="h-[180px] rounded-md" />
        <Skeleton className="h-9 rounded-pill" />
      </div>
      {[0, 1, 2].map((k) => (
        <Skeleton key={k} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}
