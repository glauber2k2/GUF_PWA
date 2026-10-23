"use client";

import { Ban, CalendarClock } from "lucide-react";
import type { AdminAccountBan, AdminDeletionSchedule } from "@guf/api/admin";
import { banStatusText, deletionStatusText, describeReason, formatStaffDateTime } from "@guf/core";
import { Banner } from "@guf/ui";
import { useStaff } from "@/features/auth";
import type { AccountActionKind } from "@/features/people/helpers/account-actions";

interface AccountStatusBannersProps {
  ban: AdminAccountBan | null;
  deletion: AdminDeletionSchedule | null;
  onAction: (kind: AccountActionKind) => void;
}

/** Topo do detalhe: suspensão ativa e exclusão agendada, cada uma com o atalho para desfazer. */
export function AccountStatusBanners({ ban, deletion, onAction }: AccountStatusBannersProps) {
  const { can } = useStaff();
  return (
    <>
      {ban && (
        <Banner
          tone="warning"
          icon={Ban}
          title={banStatusText(ban.endsAt)}
          actionLabel={can("ban_accounts") ? "Encerrar suspensão" : undefined}
          onAction={() => onAction("unban")}
        >
          Motivo: {describeReason(ban.reason, ban.note)} · desde {formatStaffDateTime(ban.createdAt).toLowerCase()}. A pessoa não consegue entrar no app.
        </Banner>
      )}
      {deletion && (
        <Banner
          tone="danger"
          icon={CalendarClock}
          title={deletionStatusText(deletion.scheduledFor)}
          actionLabel={can("delete_accounts") ? "Cancelar exclusão" : undefined}
          onAction={() => onAction("cancel_deletion")}
        >
          Motivo: {describeReason(deletion.reason, deletion.note)}.
          {deletion.lastError === "account_has_files"
            ? " A última tentativa não excluiu: a conta tem foto guardada. Peça para a pessoa excluir pelo app."
            : " A pessoa recebeu um aviso no app."}
        </Banner>
      )}
    </>
  );
}
