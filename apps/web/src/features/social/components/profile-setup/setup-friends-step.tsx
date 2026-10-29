import { useState } from "react";
import { Link2, Search } from "lucide-react";
import { SOCIAL_SEARCH_MIN_LENGTH, normalizeHandle } from "@guf/core";
import { Banner, Icon, SearchField, Skeleton } from "@/shared/components/ds";
import { useAppShell } from "@/features/app-shell";
import { usePeopleSearch } from "@/features/social/api/use-social";
import { FollowCell } from "@/features/social/components/follow-cell";
import { PersonRow } from "@/features/social/components/person-row";
import { shareProfileLink } from "@/features/social/components/profile-actions";
import { SetupStepTitle } from "./setup-step-title";

/**
 * Passo 3 · amigos (protótipo 1d): busca por nome ou @ e convite pelo link do perfil. Sem a lista de
 * "pessoas que você talvez conheça" do protótipo: o app não tem amigos em comum nem contatos.
 */
export function SetupFriendsStep({ handle }: { handle: string }) {
  const { showToast } = useAppShell();
  const [query, setQuery] = useState("");
  const search = usePeopleSearch(query);
  const isReady = normalizeHandle(query).length >= SOCIAL_SEARCH_MIN_LENGTH;

  return (
    <div className="flex flex-col gap-4">
      <SetupStepTitle title="Treine com amigos" subtitle="Quem se segue de volta entra na sua competição." />
      <SearchField placeholder="Buscar por nome ou @usuário" value={query} onChange={(e) => setQuery(e.target.value)} />

      {!isReady ? (
        <p className="m-0 text-sm text-fg-secondary">Digite pelo menos 3 letras do nome ou do @.</p>
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
        <div className="flex animate-guf-rise-fast flex-col items-center gap-2 px-3 py-6 text-center">
          <span className="grid size-12 place-items-center rounded-[14px] bg-surface-3 text-fg-secondary">
            <Icon icon={Search} size={22} />
          </span>
          <strong className="text-[15px] font-semibold">Ninguém encontrado com “{query.trim()}”</strong>
          <span className="text-[13px] leading-[18px] text-fg-secondary">Mande o convite e a pessoa aparece aqui quando entrar.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {search.data.map((person) => (
            <PersonRow key={person.userId} person={person} locked={person.visibility === "private"} subtitle={person.followsYou ? "segue você" : undefined}>
              <FollowCell person={person} />
            </PersonRow>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => void shareProfileLink(handle, showToast)}
        className="mt-2 flex min-h-16 cursor-pointer items-center gap-3 rounded-lg border-[1.5px] border-dashed border-border-strong bg-transparent px-3.5 py-3 text-left text-fg hover:border-accent-text active:scale-98"
      >
        <span className="grid size-10 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
          <Icon icon={Link2} size={18} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <strong className="text-[15px] font-semibold">Convidar por link</strong>
          <span className="truncate text-[13px] leading-[18px] text-fg-secondary">Link do seu perfil · @{handle}</span>
        </span>
      </button>
    </div>
  );
}
