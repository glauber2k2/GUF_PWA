import { Skeleton } from "@guf/ui";

/** Carregando a busca: a silhueta das linhas de resultado. */
export function ResultsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando resultados" className="overflow-hidden rounded-lg border border-border bg-surface">
      {["42%", "36%", "48%", "30%", "40%"].map((width) => (
        <div key={width} className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
          <Skeleton className="size-9 rounded-pill" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-18 rounded-sm" />
        </div>
      ))}
      <span className="sr-only">Carregando</span>
    </div>
  );
}
