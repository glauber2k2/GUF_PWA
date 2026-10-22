"use client";

import { Fragment, useState } from "react";
import { ArrowDown, ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import type { AuditEntry } from "@guf/api/admin";
import { auditActionLabel, AUDIT_ACTIONS, formatStaffDateTime } from "@guf/core";
import { Banner, Button, EmptyState, Icon, Skeleton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { useAuditLog } from "@/features/audit/api/use-audit";
import { auditDetail, auditIcon } from "@/features/audit/helpers/audit-display";
import { AdminOnly } from "@/shared/components/admin-only";
import { PageBody, PageTitle } from "@/shared/components/panel";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useDevice } from "@/shared/hooks/use-device";
import { useDevAdminState } from "@/shared/hooks/use-dev-admin-state";

const PERIODS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" },
  { value: "", label: "Tudo" },
];

const SELECT = "h-11 cursor-pointer rounded-md border border-border-strong bg-surface-3 px-3.5 text-fg";

function daysAgoIso(days: string): string | undefined {
  if (!days) return undefined;
  const d = new Date();
  d.setDate(d.getDate() - Number(days));
  return d.toISOString();
}

function AuditRowDetail({ entry }: { entry: AuditEntry }) {
  const { reason, detail } = auditDetail(entry);
  return (
    <div className="grid grid-cols-[120px_1fr] gap-x-4 gap-y-1.5 text-[13px]">
      <span className="text-fg-muted">Motivo</span>
      <strong>{reason}</strong>
      <span className="text-fg-muted">Detalhe</span>
      <span className="text-fg-secondary">{detail}</span>
    </div>
  );
}

/** 10 · Auditoria (só admin): tudo o que a equipe viu ou alterou. Registros não podem ser apagados. */
export function AuditScreen() {
  const { can, staff } = useStaff();
  if (!can("view_audit")) return <AdminOnly role={staff.role} />;
  return <AuditLog />;
}

function AuditLog() {
  const device = useDevice();
  const dev = useDevAdminState();
  const [subject, setSubject] = useState("");
  const [action, setAction] = useState("");
  const [period, setPeriod] = useState("7");
  const [expanded, setExpanded] = useState<number | null>(null);
  const debouncedSubject = useDebouncedValue(subject.trim(), 400);
  const audit = useAuditLog({ subject: debouncedSubject || undefined, action: action || undefined, from: daysAgoIso(period) });
  const rows = audit.data?.pages.flat() ?? [];
  const toggle = (id: number) => setExpanded((current) => (current === id ? null : id));
  const clearFilters = () => {
    setSubject("");
    setAction("");
    setPeriod("");
  };

  return (
    <PageBody wide>
      <div className="flex flex-col gap-1">
        <PageTitle>Auditoria</PageTitle>
        <p className="m-0 text-fg-secondary">Tudo o que a equipe viu ou alterou. Os registros não podem ser apagados.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] items-end gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-fg-secondary">Pessoa</span>
          <input
            type="search"
            placeholder="@, nome ou id"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 rounded-md border border-border-strong bg-surface-3 px-3.5 text-fg outline-none focus:border-focus focus:shadow-focus"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-fg-secondary">Ação</span>
          <select value={action} onChange={(e) => setAction(e.target.value)} className={SELECT}>
            <option value="">Todas</option>
            {Object.entries(AUDIT_ACTIONS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-fg-secondary">Período</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className={SELECT}>
            {PERIODS.map((p) => (
              <option key={p.label} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {dev.forceLoading || audit.isPending ? (
        <div aria-busy="true" aria-label="Carregando registros" className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-13 rounded-md" />
          ))}
        </div>
      ) : audit.isError ? (
        <Banner tone="danger" title="Não foi possível carregar a auditoria." actionLabel="Tentar de novo" onAction={() => void audit.refetch()}>
          {audit.error.message}
        </Banner>
      ) : rows.length === 0 ? (
        <EmptyState icon={ScrollText} title="Nenhum registro com esses filtros" message="Aumente o período ou limpe os filtros para ver mais." actionLabel="Limpar filtros" onAction={clearFilters} />
      ) : device === "mobile" ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((entry) => (
            <li key={entry.id} className="overflow-hidden rounded-lg border border-border bg-surface">
              <button type="button" aria-expanded={expanded === entry.id} onClick={() => toggle(entry.id)} className="flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left">
                <span className="grid size-9 flex-none place-items-center rounded-md bg-surface-3 text-fg-secondary">
                  <Icon icon={auditIcon(entry.action)} size={16} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <strong>{auditActionLabel(entry.action)}</strong>
                  <span className="text-[13px] text-fg-secondary">
                    {entry.actorName} · {entry.subjectLabel}
                  </span>
                  <span className="text-[12.5px] text-fg-muted">{formatStaffDateTime(entry.occurredAt)}</span>
                </span>
                <Icon icon={expanded === entry.id ? ChevronUp : ChevronDown} size={18} className="mt-2 text-fg-muted" />
              </button>
              {expanded === entry.id && (
                <div className="pr-4 pb-3.5 pl-16">
                  <AuditRowDetail entry={entry} />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <table className="w-full border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-surface-elevated text-overline tracking-[.08em] text-fg-muted uppercase">
                <th scope="col" aria-sort="descending" className="h-11 border-b border-border px-4 text-left font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-fg">
                    Quando
                    <Icon icon={ArrowDown} size={13} />
                  </span>
                </th>
                <th scope="col" className="border-b border-border px-4 text-left font-semibold">Colaborador</th>
                <th scope="col" className="border-b border-border px-4 text-left font-semibold">Ação</th>
                <th scope="col" className="border-b border-border px-4 text-left font-semibold">Pessoa</th>
                <th scope="col" className="w-13 border-b border-border">
                  <span className="sr-only">Detalhes</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <Fragment key={entry.id}>
                  <tr onClick={() => toggle(entry.id)} className="cursor-pointer border-b border-border hover:bg-surface-elevated">
                    <td className="px-4 py-3 whitespace-nowrap text-fg-secondary tabular-nums">{formatStaffDateTime(entry.occurredAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{entry.actorName}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <Icon icon={auditIcon(entry.action)} size={15} className="text-fg-secondary" />
                        {auditActionLabel(entry.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">{entry.subjectLabel}</td>
                    <td className="p-1">
                      <button
                        type="button"
                        aria-expanded={expanded === entry.id}
                        aria-label="Ver motivo"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggle(entry.id);
                        }}
                        className="grid size-11 cursor-pointer place-items-center rounded-md text-fg-muted"
                      >
                        <Icon icon={expanded === entry.id ? ChevronUp : ChevronDown} size={18} />
                      </button>
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr className="border-b border-border bg-surface-elevated">
                      <td colSpan={5} className="px-4 pt-3 pb-4">
                        <AuditRowDetail entry={entry} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {audit.hasNextPage && (
        <Button variant="secondary" loading={audit.isFetchingNextPage} onClick={() => void audit.fetchNextPage()} className="self-center">
          Carregar mais
        </Button>
      )}
    </PageBody>
  );
}
