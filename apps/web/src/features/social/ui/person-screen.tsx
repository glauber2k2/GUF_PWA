"use client";

import { useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Banner, IconButton, Skeleton } from "@/shared/components/ds";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { usePersonByHandle } from "@/features/social/api/use-social";
import { SocialProfileScreen } from "@/features/social/ui/social-profile-screen";

/** /pessoa?u=@handle (também é o link de convite): encontra a pessoa pelo @ e abre o perfil. */
export function PersonScreen() {
  const handle = useSearchParams().get("u");
  const goBack = useGoBack("/competicao");
  const person = usePersonByHandle(handle);

  if (person.data) return <SocialProfileScreen userId={person.data} />;

  return (
    <main className="flex flex-col gap-4 px-4">
      <div className="-mx-4 box-content flex h-[52px] items-center px-2 pt-[env(safe-area-inset-top)]">
        <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={goBack} />
      </div>
      {!handle || person.isError ? (
        <Banner tone="danger" actionLabel={handle ? "Tentar" : undefined} onAction={handle ? () => void person.refetch() : undefined}>
          {person.error?.message ?? "Link de perfil inválido. Peça um novo link para a pessoa."}
        </Banner>
      ) : (
        <Skeleton className="h-40 w-full rounded-lg" />
      )}
    </main>
  );
}
