import { Skeleton } from "@/components/ds";

/** Carregamento da lista de Projetos: mesma silhueta do card ativo e dos demais projetos. */
export function ProjectsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando projetos" className="flex flex-col gap-3">
      <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-16 rounded-pill" />
          <Skeleton className="size-7 rounded-sm" />
        </div>
        <Skeleton className="h-[22px] w-[220px]" />
        <Skeleton className="w-40" />
        <Skeleton className="h-9 rounded-sm" />
        <Skeleton className="h-12 rounded-md" />
      </div>
      <Skeleton className="h-3 w-[120px]" />
      <Skeleton className="h-[84px] rounded-lg" />
      <Skeleton className="h-[84px] rounded-lg" />
    </div>
  );
}
