"use client";

import { useState } from "react";
import { ArrowUp, ShieldAlert, ShieldCheck, UserPlus } from "lucide-react";
import type { StaffRow } from "@guf/api/admin";
import { formatStaffDateTime, STAFF_ROLES } from "@guf/core";
import { Avatar, Banner, Button, cn, Icon, Skeleton } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { useStaffList } from "@/features/team/api/use-team";
import { MemberMenu } from "@/features/team/components/member-menu";
import { DisableDialog, InviteDialog, RoleDialog } from "@/features/team/components/team-dialogs";
import { AdminOnly } from "@/shared/components/admin-only";
import { ROLE_ICONS } from "@/shared/components/badges";
import { MobileActionBar } from "@/shared/components/mobile-action-bar";
import { PageBody, PageTitle } from "@/shared/components/panel";
import { useDevice } from "@/shared/hooks/use-device";
import { useToast } from "@/shared/libs/toast-provider";

type TeamDialog = { kind: "invite" } | { kind: "role"; member: StaffRow } | { kind: "disable"; member: StaffRow } | null;

const STATUS_LABELS: Record<StaffRow["status"], string> = { active: "Ativo", invited: "Convite enviado", disabled: "Desativado" };

function MfaStatus({ member, long = false }: { member: StaffRow; long?: boolean }) {
  return member.hasVerifiedFactor ? (
    <span className="inline-flex items-center gap-1.5 text-success">
      <Icon icon={ShieldCheck} size={15} />
      {long ? "Segundo fator ativo" : "Ativo"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-warning">
      <Icon icon={ShieldAlert} size={15} />
      {long ? "Segundo fator pendente" : "Pendente"}
    </span>
  );
}

function RoleLabel({ member }: { member: StaffRow }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon icon={ROLE_ICONS[member.role]} size={15} className="text-fg-secondary" />
      {STAFF_ROLES[member.role].label}
    </span>
  );
}

/** 11 · Equipe (só admin): papel, segundo fator e situação; convidar, mudar papel e desativar. */
export function TeamScreen() {
  const { can, staff } = useStaff();
  if (!can("manage_team")) return <AdminOnly role={staff.role} />;
  return <Team />;
}

function Team() {
  const device = useDevice();
  const toast = useToast();
  const team = useStaffList();
  const [dialog, setDialog] = useState<TeamDialog>(null);
  const done = (message: string) => toast(message, { tone: "success" });
  const members = team.data ?? [];

  const menu = (member: StaffRow) =>
    member.isMe ? null : (
      <MemberMenu member={member} onChangeRole={() => setDialog({ kind: "role", member })} onToggleDisabled={() => setDialog({ kind: "disable", member })} />
    );

  return (
    <PageBody wide>
      <PageTitle
        actions={
          <Button icon={UserPlus} onClick={() => setDialog({ kind: "invite" })}>
            Convidar
          </Button>
        }
      >
        Equipe
      </PageTitle>
      {team.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-15 rounded-md" />
          ))}
        </div>
      ) : team.isError ? (
        <Banner tone="danger" title="Não foi possível carregar a equipe." actionLabel="Tentar de novo" onAction={() => void team.refetch()}>
          {team.error.message}
        </Banner>
      ) : device === "mobile" ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {members.map((member) => (
            <li key={member.userId} className={cn("flex flex-col gap-2.5 rounded-lg border border-border bg-surface py-3.5 pr-2 pl-4", member.status === "disabled" && "opacity-60")}>
              <div className="flex items-center gap-3">
                <Avatar name={member.displayName} size="sm" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong>
                    {member.displayName}
                    {member.isMe && <span className="font-medium text-fg-muted"> (você)</span>}
                  </strong>
                  <span className="truncate text-[13px] text-fg-secondary">{member.email}</span>
                </span>
                {menu(member)}
              </div>
              <div className="flex flex-wrap gap-x-3.5 gap-y-2 text-[13px] text-fg-secondary">
                <RoleLabel member={member} />
                <MfaStatus member={member} long />
                <span>{STATUS_LABELS[member.status]}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-border bg-surface">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-elevated text-overline tracking-[.08em] text-fg-muted uppercase">
                <th scope="col" aria-sort="ascending" className="h-11 rounded-tl-lg border-b border-border px-4 text-left font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-fg">
                    Colaborador
                    <Icon icon={ArrowUp} size={13} />
                  </span>
                </th>
                <th scope="col" className="border-b border-border px-4 text-left font-semibold">Papel</th>
                <th scope="col" className="border-b border-border px-4 text-left font-semibold">Segundo fator</th>
                {device === "desktop" && <th scope="col" className="border-b border-border px-4 text-left font-semibold">Status</th>}
                {device === "desktop" && <th scope="col" className="border-b border-border px-4 text-left font-semibold">Último acesso</th>}
                <th scope="col" className="w-15 rounded-tr-lg border-b border-border">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.userId} className={cn("border-b border-border last:border-b-0", member.status === "disabled" && "opacity-60")}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <Avatar name={member.displayName} size="sm" />
                      <span className="flex min-w-0 flex-col">
                        <strong className="whitespace-nowrap">
                          {member.displayName}
                          {member.isMe && <span className="font-medium text-fg-muted"> (você)</span>}
                        </strong>
                        <span className="text-[13px] text-fg-secondary">{member.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <RoleLabel member={member} />
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <MfaStatus member={member} />
                  </td>
                  {device === "desktop" && <td className="px-4 py-2.5 whitespace-nowrap text-fg-secondary">{STATUS_LABELS[member.status]}</td>}
                  {device === "desktop" && (
                    <td className="px-4 py-2.5 whitespace-nowrap text-fg-secondary">{member.lastSeenAt ? formatStaffDateTime(member.lastSeenAt) : "—"}</td>
                  )}
                  <td className="px-2 py-1">{menu(member)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MobileActionBar>
        <Button size="tall" icon={UserPlus} fullWidth onClick={() => setDialog({ kind: "invite" })}>
          Convidar
        </Button>
      </MobileActionBar>

      {dialog?.kind === "invite" && <InviteDialog onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "role" && <RoleDialog member={dialog.member} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "disable" && <DisableDialog member={dialog.member} onClose={() => setDialog(null)} onDone={done} />}
    </PageBody>
  );
}
