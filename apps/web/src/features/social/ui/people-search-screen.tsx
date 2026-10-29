"use client";

import { useState } from "react";
import { ChevronLeft, Share2, UserSearch } from "lucide-react";
import { SOCIAL_SEARCH_MIN_LENGTH, normalizeHandle } from "@guf/core";
import { Banner, Button, EmptyState, IconButton, SearchField, Skeleton } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { useGoBack } from "@/shared/hooks/use-go-back";
import { useMySocial, usePeopleSearch } from "@/features/social/api/use-social";
import { FollowCell } from "@/features/social/components/follow-cell";
import { PersonRow } from "@/features/social/components/person-row";
import { shareProfileLink } from "@/features/social/components/profile-actions";
import { TOUR_TARGETS } from "@/features/onboarding";

/**
 * Busca simples de pessoas (por @ ou nome, a partir de 3 caracteres) e convite pelo link do perfil.
 * Tela provisória: a versão final vem de um protótipo próprio.
 */
export function PeopleSearchScreen() {
  const goBack = useGoBack("/competicao");
  const { showToast } = useAppShell();
  const me = useMySocial();
  const [query, setQuery] = useState("");
  const search = usePeopleSearch(query);
  const ready = normalizeHandle(query).length >= SOCIAL_SEARCH_MIN_LENGTH;

  return (
    <main className="flex flex-col gap-4 px-4">
      <div className="sticky top-0 z-[5] -mx-4 box-content flex h-14 items-center gap-1 bg-background/90 pr-4 pl-1.5 pt-[env(safe-area-inset-top)] backdrop-blur-[12px]">
        <IconButton icon={ChevronLeft} label="Voltar" variant="ghost" onClick={goBack} />
        <h1 className="m-0 min-w-0 truncate text-xl leading-[26px] font-bold tracking-[-0.01em]">Encontrar pessoas</h1>
      </div>

      <div data-tour={TOUR_TARGETS.peopleSearch} className="flex flex-col gap-4">
        <SearchField placeholder="Buscar por @ ou nome" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />

        {me.data && (
          <Button variant="secondary" size="tall" icon={Share2} fullWidth onClick={() => void shareProfileLink(me.data.handle, showToast)}>
            Convidar pelo meu link
          </Button>
        )}
      </div>

      {!ready ? (
        <p className="m-0 text-sm text-fg-secondary">Digite pelo menos 3 letras do @ ou do nome. Vocês competem quando se seguem mutuamente.</p>
      ) : search.isError ? (
        <Banner tone="danger" actionLabel="Tentar" onAction={() => void search.refetch()}>
          {search.error.message}
        </Banner>
      ) : search.isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : search.data.length === 0 ? (
        <EmptyState icon={UserSearch} title="Ninguém encontrado" message="Confira o @ ou peça o link do perfil para a pessoa." />
      ) : (
        <div className="flex flex-col gap-2">
          {search.data.map((person) => (
            <PersonRow key={person.userId} person={person} locked={person.visibility === "private"} subtitle={person.followsYou ? "segue você" : undefined}>
              <FollowCell person={person} />
            </PersonRow>
          ))}
        </div>
      )}
    </main>
  );
}
