"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FilePenLine, Megaphone, Plus } from "lucide-react";
import type { AdminAnnouncementSummary } from "@guf/api/admin";
import { ANNOUNCEMENT_STATES, type AnnouncementState } from "@guf/core";
import { Banner, Button, cn, EmptyState, Skeleton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { useAnnouncementList } from "@/features/announcements/api/use-announcements-admin";
import { AnnouncementList } from "@/features/announcements/components/announcement-list";
import { editorPath, listPath, resultPath } from "@/features/announcements/helpers/announcement-display";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { PageBody, PageTitle } from "@/shared/components/panel";
import { useDevice } from "@/shared/hooks/use-device";
import { useDevAdminState } from "@/shared/hooks/use-dev-admin-state";
import { usePlanNames } from "@/shared/hooks/use-plan-options";

const TABS: AnnouncementState[] = ["draft", "scheduled", "active", "ended"];
const TAB_PARAM: Record<AnnouncementState, string> = { draft: "drafts", scheduled: "scheduled", active: "active", ended: "ended" };

const EMPTY_TEXT: Record<AnnouncementState, { title: string; message: string }> = {
  draft: { title: "Nenhum rascunho", message: "Comunicados salvos sem publicar aparecem aqui." },
  scheduled: { title: "Nenhum comunicado agendado", message: "Os que começam numa data futura aparecem aqui." },
  active: { title: "Nenhum comunicado ativo", message: "Os que estão aparecendo no app agora ficam aqui." },
  ended: { title: "Nenhum comunicado encerrado", message: "Os que já terminaram ficam aqui, com os números." },
};

function tabFromParam(param: string | null): AnnouncementState {
  return TABS.find((t) => TAB_PARAM[t] === param) ?? "active";
}

/** 7 · Comunicados por situação (abas), com formato, público, período e números. */
export function AnnouncementsScreen() {
  const router = useRouter();
  const device = useDevice();
  const dev = useDevAdminState();
  const { can } = useStaff();
  const planNames = usePlanNames();
  const list = useAnnouncementList();
  const tab = tabFromParam(useSearchParams().get("aba"));
  const canCreate = can("draft_announcements");
  const items = (list.data ?? []).filter((a) => a.state === tab);

  const open = (item: AdminAnnouncementSummary) => router.push(item.state === "draft" ? editorPath(item.id) : resultPath(item.id));
  const isLoading = dev.forceLoading || list.isPending;

  return (
    <PageBody wide>
      <PageTitle
        actions={
          canCreate && (
            <Button icon={Plus} onClick={() => router.push(editorPath())}>
              Novo comunicado
            </Button>
          )
        }
      >
        Comunicados
      </PageTitle>
      <div role="tablist" aria-label="Situação" className="-mx-1 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => {
          const selected = t === tab;
          const count = (list.data ?? []).filter((a) => a.state === t).length;
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => router.replace(listPath(TAB_PARAM[t]))}
              className={cn(
                "-mb-px flex h-12 flex-none cursor-pointer items-center gap-2 border-b-2 px-3",
                selected ? "border-accent-text font-semibold text-fg" : "border-transparent font-medium text-fg-secondary hover:text-fg",
              )}
            >
              {ANNOUNCEMENT_STATES[t].tabLabel}
              <span className="grid h-5 min-w-5.5 place-items-center rounded-pill bg-surface-3 px-1.5 text-xs tabular-nums">{list.data ? count : "–"}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div aria-busy="true" aria-label="Carregando comunicados" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : list.isError ? (
        <Banner tone="danger" title="Não foi possível carregar os comunicados." actionLabel="Tentar de novo" onAction={() => void list.refetch()}>
          Verifique a internet e tente de novo. Nada foi alterado.
        </Banner>
      ) : items.length === 0 ? (
        <EmptyState
          icon={tab === "draft" ? FilePenLine : Megaphone}
          title={EMPTY_TEXT[tab].title}
          message={EMPTY_TEXT[tab].message}
          actionLabel={canCreate ? "Novo comunicado" : undefined}
          onAction={canCreate ? () => router.push(editorPath()) : undefined}
        />
      ) : (
        <AnnouncementList items={items} device={device} planNames={planNames} onOpen={open} />
      )}

      {canCreate && (
        <MobileActionBar>
          <Button size="tall" icon={Plus} fullWidth onClick={() => router.push(editorPath())}>
            Novo comunicado
          </Button>
        </MobileActionBar>
      )}
    </PageBody>
  );
}
