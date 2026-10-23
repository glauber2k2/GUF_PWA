"use client";

import { Ban, CalendarClock, Copy, Crown, Eye, EyeOff, FileText, Globe, History, KeyRound, Lock, Pencil, ScrollText, ShieldCheck, ShieldOff, Unlink, X } from "lucide-react";
import type { AdminUserDetail, AdminUserDocument } from "@guf/api/admin";
import {
  auditActionLabel,
  banStatusText,
  deletionStatusText,
  describeReason,
  DOCUMENT_ACCEPTANCE_LABELS,
  formatStaffDateTime,
  loginProviderLabel,
  type DocumentAcceptance,
} from "@guf/core";
import { Avatar, Banner, Button, cn, Icon, IconButton, Tag } from "@guf/ui";
import { useStaff } from "@/features/auth";
import { AccountActionsMenu } from "@/features/people/components/account-actions-menu";
import type { AccountActionKind } from "@/features/people/helpers/account-actions";
import { DOCUMENT_LABELS, GRANT_SOURCE_LABELS, displayName, formatDate } from "@/features/people/helpers/people";
import type { EditField } from "@/features/people/hooks/use-account-edit";
import { InfoRow, Panel, PanelSection } from "@/shared/components/panel";

interface PersonDetailProps {
  person: AdminUserDetail;
  revealedEmail: string | null;
  onClose?: () => void;
  onCopyId: () => void;
  onRevealEmail: () => void;
  onHideEmail: () => void;
  onEdit: (field: EditField) => void;
  onUnlink: (provider: string) => void;
  onAction: (kind: AccountActionKind) => void;
  onAnnounce: () => void;
}

const DOCUMENT_STATUS_TONE: Record<DocumentAcceptance, string> = {
  accepted: "bg-success/14 text-success",
  outdated: "bg-warning/14 text-warning",
  not_accepted: "bg-surface-3 text-fg-secondary",
};

function documentDetail(doc: AdminUserDocument): string {
  if (doc.status === "not_accepted") {
    return doc.docType === "subscription_terms" ? `Versão vigente ${doc.currentVersion} · pedido só ao assinar` : `Versão vigente ${doc.currentVersion} · nunca aceito`;
  }
  const accepted = `Versão ${doc.acceptedVersion} aceita em ${formatDate(doc.acceptedAt as string)}`;
  return doc.status === "outdated" ? `${accepted} · vigente ${doc.currentVersion}` : accepted;
}

const PROVIDER_ICONS: Record<string, typeof KeyRound> = { email: KeyRound };

function ProviderBadge({ provider }: { provider: string }) {
  const icon = PROVIDER_ICONS[provider];
  return (
    <span className="grid size-9 flex-none place-items-center rounded-md bg-surface-3 text-[15px] font-bold text-fg-secondary">
      {icon ? <Icon icon={icon} size={17} /> : loginProviderLabel(provider).charAt(0)}
    </span>
  );
}

/**
 * 4a–4d · Resumo da conta (docs/admin-panel.md §1.3). Medidas, observações, conversas e cargas não
 * existem aqui de propósito; o e-mail aparece mascarado até "Mostrar e-mail" (auditado).
 */
export function PersonDetail({ person, revealedEmail, onClose, onCopyId, onRevealEmail, onHideEmail, onEdit, onUnlink, onAction, onAnnounce }: PersonDetailProps) {
  const { can } = useStaff();
  const name = displayName(person.name, person.handle);
  const activeGrant = person.planGrants.find((g) => !g.revokedAt && (!g.validUntil || g.validUntil > new Date().toISOString()));
  const canEditSomething = can("edit_profile") || can("change_plan");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-4">
        <Avatar name={name} size="lg" tone="accent" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="m-0 text-[22px] leading-7 font-bold tracking-[-0.02em]">{name}</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm text-fg-secondary">
            <span>{person.handle ? `@${person.handle}` : "Sem @"}</span>
            <Tag size="sm" icon={person.plan.isDefault ? undefined : Crown}>
              {person.plan.name}
            </Tag>
            <span className="inline-flex items-center gap-1 text-[13px]">
              <Icon icon={person.isPrivate ? Lock : Globe} size={13} />
              Perfil {person.isPrivate ? "privado" : "aberto"}
            </span>
          </div>
        </div>
        <AccountActionsMenu
          name={name}
          isStaff={person.isStaff}
          isBanned={person.ban !== null}
          hasScheduledDeletion={person.deletion !== null}
          onAction={onAction}
          onAnnounce={onAnnounce}
        />
        {onClose && <IconButton icon={X} label="Fechar detalhe" variant="ghost" onClick={onClose} />}
      </div>

      {person.ban && (
        <Banner
          tone="warning"
          icon={Ban}
          title={banStatusText(person.ban.endsAt)}
          actionLabel={can("ban_accounts") ? "Encerrar suspensão" : undefined}
          onAction={() => onAction("unban")}
        >
          Motivo: {describeReason(person.ban.reason, person.ban.note)} · desde {formatStaffDateTime(person.ban.createdAt)}. A pessoa não consegue entrar no app.
        </Banner>
      )}
      {person.deletion && (
        <Banner
          tone="danger"
          icon={CalendarClock}
          title={deletionStatusText(person.deletion.scheduledFor)}
          actionLabel={can("delete_accounts") ? "Cancelar exclusão" : undefined}
          onAction={() => onAction("cancel_deletion")}
        >
          Motivo: {describeReason(person.deletion.reason, person.deletion.note)}.
          {person.deletion.lastError === "account_has_files"
            ? " A última tentativa não excluiu: a conta tem foto guardada. Peça para a pessoa excluir pelo app."
            : " A pessoa recebeu um aviso no app."}
        </Banner>
      )}

      <div className="flex items-start gap-2.5 rounded-md bg-surface-3 px-3 py-2.5 text-[13px] leading-[18px] text-fg-secondary">
        <Icon icon={EyeOff} size={16} className="mt-px flex-none" />
        Medidas, observações, conversas e cargas não aparecem no painel.
      </div>
      {!canEditSomething && (
        <Banner tone="info" title="Seu papel é Leitura.">
          Você pode consultar a conta. Para alterar, peça a alguém do Suporte.
        </Banner>
      )}

      <PanelSection id="sec-conta" title="Conta">
        <Panel as="dl">
          <InfoRow label="Id">
            <span className="max-w-[180px] truncate font-display text-base tracking-[.02em] tabular-nums sm:max-w-none">{person.userId}</span>
            <IconButton icon={Copy} label="Copiar id" variant="ghost" onClick={onCopyId} />
          </InfoRow>
          <InfoRow label="Criada em" className="pr-4">
            {formatDate(person.createdAt)}
          </InfoRow>
          <InfoRow label="Último acesso" className="pr-4">
            {person.lastSignInAt ? formatStaffDateTime(person.lastSignInAt) : "—"}
          </InfoRow>
          <div className="flex flex-col gap-1.5 py-2.5 pr-2 pl-4">
            <div className="flex flex-wrap items-center gap-3">
              <dt className="flex-1 text-fg-secondary">E-mail</dt>
              <dd className="m-0 flex flex-wrap items-center gap-2">
                <span className="break-all">{revealedEmail ?? person.maskedEmail ?? "—"}</span>
                {can("reveal_email") &&
                  (revealedEmail ? (
                    <Button variant="ghost" icon={EyeOff} onClick={onHideEmail}>
                      Ocultar
                    </Button>
                  ) : (
                    <Button variant="secondary" icon={Eye} onClick={onRevealEmail}>
                      Mostrar e-mail
                    </Button>
                  ))}
              </dd>
            </div>
            <span className="flex items-center gap-1.5 text-[12.5px] text-fg-muted">
              <Icon icon={ScrollText} size={13} />
              Ao mostrar, o acesso fica registrado na auditoria.
            </span>
          </div>
        </Panel>
      </PanelSection>

      <PanelSection id="sec-login" title="Logins">
        <Panel as="ul">
          {person.logins.map((login) => (
            <li key={login.provider} className="flex min-h-15 items-center gap-3 py-2 pr-3 pl-4">
              <ProviderBadge provider={login.provider} />
              <span className="flex min-w-0 flex-1 flex-col">
                <strong>{loginProviderLabel(login.provider)}</strong>
                <span className="text-[13px] text-fg-secondary">
                  {login.provider === "email" ? "Criado" : "Vinculado"} em {formatDate(login.createdAt)}
                </span>
              </span>
              {login.provider !== "email" && can("unlink_login") && (
                <Button variant="secondary" icon={Unlink} onClick={() => onUnlink(login.provider)}>
                  Desvincular
                </Button>
              )}
            </li>
          ))}
        </Panel>
      </PanelSection>

      <PanelSection id="sec-plano" title="Plano">
        <Panel>
          <div className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
              <strong className="text-lg leading-6">{person.plan.name}</strong>
              <span className="text-[13px] text-fg-secondary">
                {activeGrant
                  ? `Origem: ${GRANT_SOURCE_LABELS[activeGrant.source]}${activeGrant.validUntil ? ` · Válido até ${formatDate(activeGrant.validUntil)}` : ""}`
                  : "Plano padrão, sem assinatura."}
              </span>
            </div>
            {can("change_plan") && (
              <Button variant="secondary" icon={Pencil} onClick={() => onEdit("plan")}>
                Mudar plano
              </Button>
            )}
          </div>
          {person.planGrants.length > 0 && (
            <ol className="m-0 flex list-none flex-col px-4 pt-2 pb-3">
              {person.planGrants.map((grant) => (
                <li key={grant.id} className="flex gap-3 py-2 text-[13px]">
                  <Icon icon={History} size={14} className="mt-[3px] text-fg-muted" />
                  <span className="flex flex-1 flex-col">
                    <span className="font-semibold text-fg">{grant.planName}</span>
                    <span className="text-fg-secondary">
                      {formatDate(grant.validFrom)}
                      {grant.revokedAt ? ` – ${formatDate(grant.revokedAt)} (encerrado)` : grant.validUntil ? ` – ${formatDate(grant.validUntil)}` : " · sem data para acabar"} ·{" "}
                      {GRANT_SOURCE_LABELS[grant.source]}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </PanelSection>

      <PanelSection id="sec-social" title="Perfil social">
        <Panel as="dl">
          <InfoRow label="@">
            {person.handle ? `@${person.handle}` : "—"}
            {can("edit_profile") && <IconButton icon={Pencil} label="Editar @" variant="ghost" onClick={() => onEdit("handle")} />}
          </InfoRow>
          <InfoRow label="Nome">
            {person.name ?? "—"}
            {can("edit_profile") && <IconButton icon={Pencil} label="Editar nome" variant="ghost" onClick={() => onEdit("name")} />}
          </InfoRow>
          <InfoRow label="Visibilidade" className="pr-4">
            <Icon icon={person.isPrivate ? Lock : Globe} size={15} className="text-fg-secondary" />
            {person.isPrivate ? "Privado" : "Aberto"}
          </InfoRow>
          <div className="grid grid-cols-3">
            {[
              { label: "Seguidores", value: person.followers },
              { label: "Seguindo", value: person.following },
              { label: "Treinos", value: person.workouts },
            ].map((stat, index) => (
              <div key={stat.label} className={index < 2 ? "flex flex-col border-r border-border px-4 py-3" : "flex flex-col px-4 py-3"}>
                <dt className="text-[13px] text-fg-secondary">{stat.label}</dt>
                <dd className="m-0 font-display text-[28px] leading-8 font-bold tabular-nums">{stat.value.toLocaleString("pt-BR")}</dd>
              </div>
            ))}
          </div>
        </Panel>
      </PanelSection>

      <PanelSection id="sec-docs" title="Documentos">
        <Panel as="ul">
          {person.documents.length === 0 && <li className="px-4 py-3 text-[13px] text-fg-secondary">Nenhum documento publicado.</li>}
          {person.documents.map((doc) => (
            <li key={doc.docType} className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2">
              <Icon icon={FileText} size={17} className="text-fg-secondary" />
              <span className="flex min-w-0 flex-[1_1_12rem] flex-col">
                <strong className="text-sm">{DOCUMENT_LABELS[doc.docType] ?? doc.docType}</strong>
                <span className="text-[13px] text-fg-secondary">{documentDetail(doc)}</span>
              </span>
              <span className={cn("rounded-sm px-2 py-0.5 text-[12.5px] font-semibold", DOCUMENT_STATUS_TONE[doc.status])}>{DOCUMENT_ACCEPTANCE_LABELS[doc.status]}</span>
            </li>
          ))}
        </Panel>
      </PanelSection>

      {person.healthConsent !== null && (
        <PanelSection id="sec-saude" title="Consentimento de saúde">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3.5">
            <span className={person.healthConsent ? "grid size-9 place-items-center rounded-md bg-success/14 text-success" : "grid size-9 place-items-center rounded-md bg-surface-3 text-fg-secondary"}>
              <Icon icon={person.healthConsent ? ShieldCheck : ShieldOff} size={18} />
            </span>
            <span className="flex flex-1 flex-col">
              <strong>{person.healthConsent ? "Autorizado" : "Não autorizado"}</strong>
              <span className="text-[13px] text-fg-secondary">As medidas não aparecem no painel.</span>
            </span>
          </div>
        </PanelSection>
      )}

      <PanelSection id="sec-equipe" title="Atividade da equipe nesta conta">
        <Panel as="ol">
          {person.staffActivity.length === 0 && <li className="px-4 py-3 text-[13px] text-fg-secondary">Nenhuma alteração feita pela equipe.</li>}
          {person.staffActivity.map((activity) => (
            <li key={activity.id} className="flex gap-3 px-4 py-3">
              <Avatar name={activity.staffName} size="sm" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm">
                  <strong>{activity.staffName}</strong> · {auditActionLabel(activity.action)}
                </span>
                <span className="text-[13px] text-fg-secondary">
                  {formatStaffDateTime(activity.occurredAt)}
                  {activity.reason ? ` · Motivo: ${describeReason(activity.reason, activity.note)}` : ""}
                </span>
              </span>
            </li>
          ))}
        </Panel>
      </PanelSection>
    </div>
  );
}
