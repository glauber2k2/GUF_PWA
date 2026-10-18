import { Skeleton } from "@/shared/components/ds";

/** Carregando o Perfil: cartão do usuário, cartão de instalar e três seções. */
export function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando perfil" className="flex flex-col gap-4">
      <div className="flex items-center gap-3.5 rounded-lg border border-border bg-surface p-5">
        <Skeleton className="size-16 rounded-pill" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-[18px] w-[150px]" />
          <Skeleton className="h-3 w-[190px]" />
        </div>
      </div>
      <Skeleton className="h-[168px] w-full rounded-lg" />
      {[0, 1, 2].map((k) => (
        <div key={k} className="flex flex-col gap-3.5 rounded-lg border border-border bg-surface p-4">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
      ))}
    </div>
  );
}
