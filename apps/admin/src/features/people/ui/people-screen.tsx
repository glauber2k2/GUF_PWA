"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, UserX } from "lucide-react";
import { Avatar, Banner, Button, cn, EmptyState, Icon, Skeleton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { PEOPLE_SEARCH_INPUT_ID } from "@/features/shell";
import { usePerson, useSearchPeople } from "@/features/people/api/use-people";
import { EditAccountDialog } from "@/features/people/components/edit-account-dialog";
import { PeopleResults } from "@/features/people/components/people-results";
import { PersonDetail } from "@/features/people/components/person-detail";
import { RevealEmailDialog } from "@/features/people/components/reveal-email-dialog";
import { UnlinkDialog } from "@/features/people/components/unlink-dialog";
import { displayName, peoplePath } from "@/features/people/helpers/people";
import type { EditField } from "@/features/people/hooks/use-account-edit";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { PageBody, PageTitle } from "@/shared/components/panel";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useDevice } from "@/shared/hooks/use-device";
import { useDevAdminState } from "@/shared/hooks/use-dev-admin-state";
import { useToast } from "@/shared/libs/toast-provider";

type DialogState = { kind: "edit"; field: EditField } | { kind: "unlink"; provider: string } | { kind: "email" } | null;

function ResultsSkeleton() {
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

/**
 * 3 e 4 · Pessoas: busca enquanto digita (por @, nome, e-mail exato ou id) e o detalhe da conta.
 * No computador e no tablet o detalhe abre num painel à direita com a lista visível; no celular, sozinho.
 */
export function PeopleScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const device = useDevice();
  const dev = useDevAdminState();
  const { can } = useStaff();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState(params.get("q") ?? "");
  const selectedId = params.get("id");
  const debounced = useDebouncedValue(query.trim(), 300);
  const search = useSearchPeople(debounced);
  const person = usePerson(selectedId);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [revealed, setRevealed] = useState<{ userId: string; email: string } | null>(null);

  useEffect(() => {
    if (params.get("foco")) inputRef.current?.focus();
  }, [params]);

  useEffect(() => {
    if (debounced !== (params.get("q") ?? "")) router.replace(peoplePath({ query: debounced, userId: selectedId }), { scroll: false });
  }, [debounced, params, router, selectedId]);

  const open = (userId: string) => router.push(peoplePath({ query: debounced, userId }));
  const closeDetail = () => router.push(peoplePath({ query: debounced }));
  const typing = query.trim() !== debounced;
  const isLoading = dev.forceLoading || ((search.isFetching || typing) && query.trim().length >= 2 && !search.data);
  const results = search.data ?? [];
  const hasQuery = debounced.length >= 2;

  const detailOpen = Boolean(selectedId);
  const showList = !detailOpen || device !== "mobile";

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    toast("Id copiado", { tone: "success" });
  };

  return (
    <div className="relative min-h-full">
      {showList && (
        <div className={cn(detailOpen && device === "desktop" && "pr-[560px]")}>
          <PageBody>
            <PageTitle>Pessoas</PageTitle>
            <div className="flex flex-col gap-2">
              <label htmlFor={PEOPLE_SEARCH_INPUT_ID} className="text-[13px] font-semibold text-fg-secondary">
                Buscar por @, nome, e-mail ou id
              </label>
              <div className="relative flex items-center">
                <Icon icon={Search} size={20} className="pointer-events-none absolute left-4 text-fg-muted" />
                <input
                  ref={inputRef}
                  id={PEOPLE_SEARCH_INPUT_ID}
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="@marina, Marina Costa, marina@…"
                  className="h-14 w-full rounded-[14px] border-[1.5px] border-border-strong bg-surface-3 px-12 text-[17px] text-fg outline-none placeholder:text-fg-muted focus:border-focus focus:shadow-focus"
                />
                {device === "desktop" && (
                  <kbd className="absolute right-4 grid h-6 min-w-6 place-items-center rounded-[6px] border border-border-strong font-sans text-xs text-fg-muted">/</kbd>
                )}
              </div>
            </div>

            {search.isError && !isLoading ? (
              <Banner tone="danger" title="Não foi possível buscar." actionLabel="Tentar de novo" onAction={() => void search.refetch()}>
                {search.error.message}
              </Banner>
            ) : isLoading ? (
              <ResultsSkeleton />
            ) : !hasQuery ? (
              <EmptyState
                icon={Search}
                title="Comece digitando"
                message="Os resultados aparecem enquanto você digita. Para ir direto a uma conta, cole o id completo."
              />
            ) : results.length === 0 ? (
              <EmptyState icon={UserX} title={`Nenhuma pessoa encontrada para “${debounced}”`} message="Confira a grafia ou tente o e-mail completo. Contas excluídas não aparecem na busca." />
            ) : detailOpen && device !== "mobile" ? (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {results.map((p) => {
                  const selected = p.userId === selectedId;
                  return (
                    <li key={p.userId}>
                      <button
                        type="button"
                        aria-current={selected || undefined}
                        onClick={() => open(p.userId)}
                        className={cn(
                          "flex min-h-15 w-full cursor-pointer items-center gap-3 rounded-[14px] border-[1.5px] px-3 py-2.5 text-left",
                          selected ? "border-accent-text bg-accent/10" : "border-transparent hover:bg-surface",
                        )}
                      >
                        <Avatar name={displayName(p.name, p.handle)} size="sm" />
                        <span className="flex min-w-0 flex-1 flex-col">
                          <strong className="truncate">{displayName(p.name, p.handle)}</strong>
                          <span className="truncate text-[13px] text-fg-secondary">
                            {p.handle ? `@${p.handle}` : "Sem @"} · {p.planName}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <>
                <span aria-live="polite" className="text-[13px] text-fg-muted">
                  {results.length === 1 ? "1 pessoa" : `${results.length} pessoas`}
                </span>
                <PeopleResults people={results} device={device} onOpen={open} />
              </>
            )}
          </PageBody>
        </div>
      )}

      {detailOpen && (
        <section
          aria-label="Detalhe da pessoa"
          className={cn(
            "bg-background",
            device === "mobile" ? "min-h-full" : "fixed top-16 right-0 bottom-0 z-10 w-[min(100%,560px)] overflow-auto border-l border-border shadow-e3",
          )}
        >
          <div className="flex flex-col gap-4 p-4 pb-28 md:p-7">
            {device === "mobile" && (
              <Button variant="ghost" icon={ArrowLeft} onClick={closeDetail} className="-ml-3 self-start">
                {debounced ? `Busca: “${debounced}”` : "Voltar à busca"}
              </Button>
            )}
            {person.isPending ? (
              <div className="flex flex-col gap-3" aria-busy="true">
                <Skeleton className="h-16 w-2/3" />
                <Skeleton className="h-40" />
                <Skeleton className="h-32" />
              </div>
            ) : person.isError ? (
              <Banner tone="danger" title="Não foi possível abrir a conta." actionLabel="Tentar de novo" onAction={() => void person.refetch()}>
                {person.error.message}
              </Banner>
            ) : (
              <PersonDetail
                person={person.data}
                revealedEmail={revealed?.userId === person.data.userId ? revealed.email : null}
                onClose={device === "mobile" ? undefined : closeDetail}
                onCopyId={() => void copyId(person.data.userId)}
                onRevealEmail={() => setDialog({ kind: "email" })}
                onHideEmail={() => setRevealed(null)}
                onEdit={(field) => setDialog({ kind: "edit", field })}
                onUnlink={(provider) => setDialog({ kind: "unlink", provider })}
              />
            )}
          </div>
          {device === "mobile" && person.data && (can("change_plan") || can("edit_profile")) && (
            <MobileActionBar>
              {can("change_plan") && (
                <Button variant="secondary" size="tall" fullWidth className="flex-1" onClick={() => setDialog({ kind: "edit", field: "plan" })}>
                  Mudar plano
                </Button>
              )}
              {can("edit_profile") && (
                <Button variant="secondary" size="tall" fullWidth className="flex-1" onClick={() => setDialog({ kind: "edit", field: "handle" })}>
                  Editar @ e nome
                </Button>
              )}
            </MobileActionBar>
          )}
        </section>
      )}

      {person.data && dialog?.kind === "edit" && (
        <EditAccountDialog person={person.data} initialField={dialog.field} onClose={() => setDialog(null)} onSaved={(message) => toast(message, { tone: "success" })} />
      )}
      {person.data && dialog?.kind === "unlink" && (
        <UnlinkDialog person={person.data} provider={dialog.provider} onClose={() => setDialog(null)} onDone={(message) => toast(message, { tone: "success" })} />
      )}
      {person.data && dialog?.kind === "email" && (
        <RevealEmailDialog
          userId={person.data.userId}
          onClose={() => setDialog(null)}
          onRevealed={(email) => {
            setRevealed({ userId: person.data.userId, email });
            toast("E-mail visível. O acesso foi registrado.", { tone: "info" });
          }}
        />
      )}
    </div>
  );
}
