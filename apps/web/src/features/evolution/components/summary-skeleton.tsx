import { Skeleton } from "@/shared/components/ds";

/** Carregando o resumo: data, números, recordes e três exercícios. */
export function SummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando treino" className="flex flex-col gap-4">
      <Skeleton className="h-4 w-[150px]" />
      <div className="grid grid-cols-3 justify-items-center gap-4 rounded-lg border border-border bg-surface px-4 py-5">
        {[0, 1, 2].map((k) => (
          <div key={k} className="flex flex-col items-center gap-2">
            <Skeleton className="h-9 w-[72px] rounded-[8px]" />
            <Skeleton className="h-3 w-[52px]" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[76px] w-full rounded-lg" />
      {[0, 1, 2].map((k) => (
        <div key={k} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-[18px] w-[160px]" />
          <Skeleton className="h-5 w-[70px] rounded-[8px]" />
          <Skeleton className="h-7 w-full rounded-[8px]" />
          <Skeleton className="h-7 w-full rounded-[8px]" />
        </div>
      ))}
    </div>
  );
}
