"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Search, UserX } from "lucide-react";
import type { AdminUserSummary } from "@guf/api/admin";
import { Banner, Button, cn, EmptyState, Icon, Skeleton } from "@guf/ui";
import { editorForPeoplePath } from "@/features/announcements";
import { useStaff } from "@/features/auth";
import { PEOPLE_SEARCH_INPUT_ID } from "@/features/shell";
import { usePerson } from "@/features/people/api/use-people";
import { AccountActionDialog } from "@/features/people/components/account-action-dialog";
import { BulkActionBar } from "@/features/people/components/bulk-action-bar";
import { ChangePlanDialog } from "@/features/people/components/change-plan-dialog";
import { EditHandleDialog } from "@/features/people/components/edit-handle-dialog";
import { EditNameDialog } from "@/features/people/components/edit-name-dialog";
import { PeopleCompactList } from "@/features/people/components/people-compact-list";
import { PeopleResults } from "@/features/people/components/people-results";
import { PersonDetail } from "@/features/people/components/person-detail";
import { ResultsSkeleton } from "@/features/people/components/results-skeleton";
import { RevealEmailDialog } from "@/features/people/components/reveal-email-dialog";
import { UnlinkDialog } from "@/features/people/components/unlink-dialog";
import { ACCOUNT_ACTIONS, BULK_ACTIONS, type AccountActionKind, type AccountActionOutcome, type AccountTarget } from "@/features/people/helpers/account-actions";
import { peoplePath, type EditField } from "@/features/people/helpers/people";
import { toAccountTarget, usePeopleSelection } from "@/features/people/hooks/use-people-selection";
import { peopleSearchKeyDown, usePeopleShortcuts } from "@/features/people/hooks/use-people-shortcuts";
import { useScreenShortcutHints } from "@/shared/libs/shortcut-hints";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { ScreenShortcutLegend } from "@/shared/components/screen-shortcut-legend";
import { PageBody, PageTitle } from "@/shared/components/panel";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useDevice } from "@/shared/hooks/use-device";
import { useDevAdminState } from "@/shared/hooks/use-dev-admin-state";
import { useSearchPeople } from "@/shared/hooks/use-search-people";
import { useToast } from "@/shared/libs/toast-provider";

type DialogState =
  | { kind: "edit"; field: EditField }
  | { kind: "unlink"; provider: string }
  | { kind: "email" }
  | { kind: "action"; action: AccountActionKind; targets: AccountTarget[] }
  | null;


/** Um diálogo por campo: cada um valida e grava só a própria mudança. */
const EDIT_DIALOGS: Record<EditField, typeof ChangePlanDialog> = {
  plan: ChangePlanDialog,
  handle: EditHandleDialog,
  name: EditNameDialog,
};

function EditDialog({ field, ...props }: { field: EditField } & Parameters<typeof ChangePlanDialog>[0]) {
  const Dialog = EDIT_DIALOGS[field];
  return <Dialog {...props} />;
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
  const selection = usePeopleSelection();
  const canSelect = can("draft_announcements") || BULK_ACTIONS.some((kind) => can(ACCOUNT_ACTIONS[kind].permission));

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
  // Busca vazia com gente marcada: a lista vira a das selecionadas (para revisar antes da ação).
  const showingSelection = !hasQuery && selection.people.length > 0;
  const listed = showingSelection ? selection.people : results;

  const detailOpen = Boolean(selectedId);
  const showList = !detailOpen || device !== "mobile";
  const isSplit = detailOpen && device !== "mobile";

  /** "Mudar plano" da conta aberta usa o diálogo próprio (com o plano atual); o resto, o diálogo de ação. */
  const startAction = (action: AccountActionKind, targets: AccountTarget[]) => {
    if (action === "plan" && targets.length === 1 && targets[0]?.userId === selectedId) setDialog({ kind: "edit", field: "plan" });
    else setDialog({ kind: "action", action, targets });
  };
  const actionFor = (person: AdminUserSummary, action: AccountActionKind) => startAction(action, [toAccountTarget(person)]);
  const announceTo = (userIds: string[]) => router.push(editorForPeoplePath(userIds));

  const hasKeyboard = device !== "mobile";
  const toggleById = (userId: string) => {
    const found = listed.find((p) => p.userId === userId);
    if (found) selection.toggle(found);
  };
  const shortcutHints = usePeopleShortcuts(
    {
      onOpen: open,
      onToggle: canSelect && !detailOpen ? toggleById : undefined,
      onCloseDetail: detailOpen ? closeDetail : undefined,
      onChangePlan: detailOpen && person.data && can("change_plan") ? () => setDialog({ kind: "edit", field: "plan" }) : undefined,
      onEditHandle: detailOpen && person.data && can("edit_profile") ? () => setDialog({ kind: "edit", field: "handle" }) : undefined,
    },
    hasKeyboard,
  );
  useScreenShortcutHints(hasKeyboard ? shortcutHints : []);

  const afterAction = (action: AccountActionKind, outcome: AccountActionOutcome, message: string) => {
    toast(message, { tone: "success" });
    const doneIds = outcome.succeeded.map((t) => t.userId);
    selection.remove(doneIds);
    if (action === "delete" && selectedId && doneIds.includes(selectedId)) closeDetail();
  };

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    toast("Id copiado", { tone: "success" });
  };

  return (
    // Tablet e computador com a conta aberta: duas colunas, cada uma com a própria rolagem (o detalhe
    // nunca cobre a busca nem a lista). Celular: uma tela de cada vez.
    <div className={cn("relative", isSplit ? "flex h-full" : "min-h-full")}>
      {showList && (
        <div className={cn(isSplit && "min-w-0 flex-1 overflow-auto")}>
          <PageBody full>
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
                  onKeyDown={hasKeyboard ? peopleSearchKeyDown : undefined}
                  placeholder="@marina, Marina Costa, marina@…"
                  className="h-14 w-full rounded-[14px] border-[1.5px] border-border-strong bg-surface-3 px-12 text-[17px] text-fg outline-none placeholder:text-fg-muted focus:border-focus focus:shadow-focus"
                />
                {device === "desktop" && (
                  <kbd className="absolute right-4 grid h-6 min-w-6 place-items-center rounded-[6px] border border-border-strong font-sans text-xs text-fg-muted">/</kbd>
                )}
              </div>
            </div>

            {!detailOpen && <ScreenShortcutLegend />}

            {search.isError && !isLoading ? (
              <Banner tone="danger" title="Não foi possível buscar." actionLabel="Tentar de novo" onAction={() => void search.refetch()}>
                {search.error.message}
              </Banner>
            ) : isLoading ? (
              <ResultsSkeleton />
            ) : !hasQuery && !showingSelection ? (
              <EmptyState
                icon={Search}
                title="Comece digitando"
                message="Os resultados aparecem enquanto você digita. Para ir direto a uma conta, cole o id completo."
              />
            ) : hasQuery && results.length === 0 ? (
              <EmptyState icon={UserX} title={`Nenhuma pessoa encontrada para “${debounced}”`} message="Confira a grafia ou tente o e-mail completo. Contas excluídas não aparecem na busca." />
            ) : detailOpen && device !== "mobile" ? (
              <PeopleCompactList people={listed} selectedId={selectedId} onOpen={open} />
            ) : (
              <>
                <span aria-live="polite" className="text-[13px] text-fg-muted">
                  {showingSelection
                    ? `Selecionadas · ${listed.length}. Digite para buscar e juntar mais pessoas.`
                    : listed.length === 1
                      ? "1 pessoa"
                      : `${listed.length} pessoas`}
                </span>
                <PeopleResults
                  people={listed}
                  device={device}
                  onOpen={open}
                  selectedIds={selection.selectedIds}
                  isSelectionFull={selection.isFull}
                  onToggle={canSelect ? selection.toggle : undefined}
                  onToggleAll={canSelect ? () => selection.toggleAll(listed) : undefined}
                  onAction={actionFor}
                  onAnnounce={(p) => announceTo([p.userId])}
                />
              </>
            )}
            {selection.targets.length > 0 && !detailOpen && (
              <BulkActionBar
                count={selection.targets.length}
                isFull={selection.isFull}
                onAction={(action) => startAction(action, selection.targets)}
                onAnnounce={() => announceTo(selection.selectedIds)}
                onClear={selection.clear}
              />
            )}
          </PageBody>
        </div>
      )}

      {detailOpen && (
        <section
          aria-label="Detalhe da pessoa"
          className={cn(
            "bg-background",
            isSplit ? "w-[min(50%,560px)] flex-none overflow-auto border-l border-border" : "min-h-full",
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
                onAction={(action) => startAction(action, [toAccountTarget({ userId: person.data.userId, name: person.data.name, handle: person.data.handle })])}
                onAnnounce={() => announceTo([person.data.userId])}
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
                  Editar @
                </Button>
              )}
            </MobileActionBar>
          )}
        </section>
      )}

      {person.data && dialog?.kind === "edit" && (
        <EditDialog field={dialog.field} person={person.data} onClose={() => setDialog(null)} onSaved={(message) => toast(message, { tone: "success" })} />
      )}
      {dialog?.kind === "action" && (
        <AccountActionDialog
          kind={dialog.action}
          targets={dialog.targets}
          onClose={() => setDialog(null)}
          onDone={(outcome, message) => afterAction(dialog.action, outcome, message)}
        />
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
