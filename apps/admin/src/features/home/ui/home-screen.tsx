"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Megaphone, Search, type LucideIcon } from "lucide-react";
import { ANNOUNCEMENT_STATES, auditActionLabel, formatCount, formatShortDate, formatStaffDateTime } from "@guf/core";
import { Avatar, Banner, Button, Icon, Skeleton } from "@guf/ui";
import { editorPath, FORMAT_ICONS, formatPeriod, resultPath, useAnnouncementList } from "@/features/announcements";
import { useStaff } from "@/features/auth";
import { useAuditLog } from "@/features/audit";
import { useGoToSearch } from "@/features/shell";
import { PageBody, SectionTitle } from "@/shared/components/panel";
import { withDevState } from "@/shared/helpers/dev-state-path";
import { useDevice } from "@/shared/hooks/use-device";

const RECENT_ACTIONS = 5;

function greeting(now: Date, firstName: string): string {
  const hour = now.getHours();
  const part = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return `${part}, ${firstName}`;
}

function Shortcut({ icon, title, subtitle, onClick, trailing }: { icon: LucideIcon; title: string; subtitle: string; onClick: () => void; trailing: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-19 cursor-pointer items-center gap-3.5 rounded-lg border border-border bg-surface p-4 text-left transition-[background-color,transform] duration-150 hover:bg-surface-elevated active:scale-[.98]"
    >
      <span className="grid size-11 flex-none place-items-center rounded-md bg-surface-3 text-accent-text">
        <Icon icon={icon} size={20} />
      </span>
      <span className="flex flex-1 flex-col">
        <strong className="text-[15px]">{title}</strong>
        <span className="text-[13px] text-fg-secondary">{subtitle}</span>
      </span>
      {trailing}
    </button>
  );
}

/** 2 · Início: atalhos, comunicados ativos e agendados e (só admin) últimas ações da equipe. */
export function HomeScreen() {
  const router = useRouter();
  const device = useDevice();
  const { staff, can } = useStaff();
  const goToSearch = useGoToSearch();
  const announcements = useAnnouncementList();
  const audit = useAuditLog({}, can("view_audit"));
  const now = new Date();
  const live = (announcements.data ?? []).filter((a) => a.state === "active" || a.state === "scheduled");
  const recent = (audit.data?.pages.flat() ?? []).slice(0, RECENT_ACTIONS);

  return (
    <PageBody>
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-fg-muted">{formatShortDate(now)}</span>
        <h2 className="m-0 text-[clamp(24px,2.4vw,32px)] leading-tight font-bold tracking-[-0.02em]">{greeting(now, staff.displayName.split(" ")[0] ?? "")}</h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
        <Shortcut
          icon={Search}
          title="Buscar pessoa"
          subtitle="Por @, nome, e-mail ou id"
          onClick={goToSearch}
          trailing={device === "desktop" ? <kbd className="grid h-6 min-w-6 place-items-center rounded-[6px] border border-border-strong font-sans text-xs text-fg-muted">/</kbd> : null}
        />
        {can("draft_announcements") && (
          <Shortcut
            icon={Megaphone}
            title="Novo comunicado"
            subtitle="Tela cheia, modal, toast ou faixa"
            onClick={() => router.push(editorPath())}
            trailing={<Icon icon={ChevronRight} size={18} className="text-fg-muted" />}
          />
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-start gap-6">
        <section aria-labelledby="h-com" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2 px-1">
            <SectionTitle id="h-com" className="px-0">
              Comunicados ativos e agendados
            </SectionTitle>
            <Link href={withDevState("/comunicados")} className="inline-flex h-11 items-center gap-1 px-2 text-[15px] font-semibold text-fg no-underline hover:text-fg">
              Ver todos
              <Icon icon={ChevronRight} size={16} />
            </Link>
          </div>
          {announcements.isPending ? (
            <Skeleton className="h-40 rounded-lg" />
          ) : announcements.isError ? (
            <Banner tone="danger" actionLabel="Tentar" onAction={() => void announcements.refetch()}>
              {announcements.error.message}
            </Banner>
          ) : live.length === 0 ? (
            <p className="m-0 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-fg-secondary">Nenhum comunicado no ar ou agendado.</p>
          ) : (
            <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
              {live.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(resultPath(item.id))}
                  className="flex min-h-16 cursor-pointer items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-elevated"
                >
                  <span className="grid size-9 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
                    <Icon icon={FORMAT_ICONS[item.format]} size={17} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="truncate text-sm">{item.title}</strong>
                    <span className="text-[12.5px] text-fg-secondary">
                      {ANNOUNCEMENT_STATES[item.state].label} · {formatPeriod(item.startsAt, item.endsAt)}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-display text-xl leading-[22px] font-bold tabular-nums">{item.reachEstimate === null ? "—" : formatCount(item.reachEstimate)}</span>
                    <span className="text-[11px] text-fg-muted">alcance</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {can("view_audit") && (
          <section aria-labelledby="h-act" className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 px-1">
              <SectionTitle id="h-act" className="px-0">
                Últimas ações da equipe
              </SectionTitle>
              <Button variant="ghost" iconRight={ChevronRight} onClick={() => router.push(withDevState("/auditoria"))}>
                Auditoria
              </Button>
            </div>
            {audit.isPending ? (
              <Skeleton className="h-48 rounded-lg" />
            ) : recent.length === 0 ? (
              <p className="m-0 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-fg-secondary">Nenhuma ação registrada ainda.</p>
            ) : (
              <ol className="m-0 flex list-none flex-col overflow-hidden rounded-lg border border-border bg-surface p-0">
                {recent.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-3 border-b border-border px-4 py-3 last:border-b-0">
                    <Avatar name={entry.actorName} size="sm" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm text-pretty">
                        <strong>{entry.actorName}</strong> {auditActionLabel(entry.action).toLowerCase()}
                      </span>
                      <span className="text-[12.5px] text-fg-muted">
                        {formatStaffDateTime(entry.occurredAt)} · {entry.subjectLabel}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}
      </div>
    </PageBody>
  );
}
