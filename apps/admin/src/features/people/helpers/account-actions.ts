import { Ban, CalendarClock, CalendarX, Crown, KeyRound, ShieldCheck, Trash2, Unlink, type LucideIcon } from "lucide-react";
import type { ChangeReason, StaffPermission } from "@guf/core";

/** Ações de conta que valem para uma pessoa ou para várias selecionadas (cada uma vai ao banco à parte). */
export type AccountActionKind = "plan" | "unlink_social" | "reset_password" | "ban" | "unban" | "delete" | "schedule_deletion" | "cancel_deletion";

interface Reasoned {
  reason: ChangeReason;
  note: string;
}

export type AccountActionInput =
  | ({ kind: "plan"; planCode: string; validUntil: string | null } & Reasoned)
  | { kind: "unlink_social"; note: string }
  | ({ kind: "reset_password" } & Reasoned)
  | ({ kind: "ban"; endsAt: string | null } & Reasoned)
  | ({ kind: "unban" } & Reasoned)
  | ({ kind: "delete" } & Reasoned)
  | ({ kind: "schedule_deletion"; at: string } & Reasoned)
  | ({ kind: "cancel_deletion" } & Reasoned);

export interface AccountActionMeta {
  label: string;
  /** Título do diálogo; recebe quantas pessoas. */
  title: (count: number) => string;
  /** Texto do aviso de sucesso; recebe quantas deram certo. */
  done: (count: number) => string;
  icon: LucideIcon;
  permission: StaffPermission;
  isDanger: boolean;
}

function people(count: number): string {
  return count === 1 ? "1 pessoa" : `${count} pessoas`;
}

export const ACCOUNT_ACTIONS: Record<AccountActionKind, AccountActionMeta> = {
  plan: {
    label: "Mudar plano",
    title: (n) => (n === 1 ? "Mudar plano" : `Mudar o plano de ${people(n)}`),
    done: (n) => `Plano alterado para ${people(n)}`,
    icon: Crown,
    permission: "change_plan",
    isDanger: false,
  },
  unlink_social: {
    label: "Desvincular logins sociais",
    title: (n) => (n === 1 ? "Desvincular logins sociais?" : `Desvincular os logins sociais de ${people(n)}?`),
    done: (n) => `Logins sociais desvinculados de ${people(n)}`,
    icon: Unlink,
    permission: "unlink_login",
    isDanger: true,
  },
  reset_password: {
    label: "Redefinir senha",
    title: () => "Mandar link para criar senha nova?",
    done: () => "Link enviado para o e-mail da pessoa",
    icon: KeyRound,
    permission: "reset_password",
    isDanger: false,
  },
  ban: {
    label: "Suspender conta",
    title: (n) => (n === 1 ? "Suspender conta" : `Suspender ${people(n)}`),
    done: (n) => (n === 1 ? "Conta suspensa" : `${people(n)} suspensas`),
    icon: Ban,
    permission: "ban_accounts",
    isDanger: true,
  },
  unban: {
    label: "Encerrar suspensão",
    title: (n) => (n === 1 ? "Encerrar a suspensão?" : `Encerrar a suspensão de ${people(n)}?`),
    done: (n) => (n === 1 ? "Suspensão encerrada" : `Suspensão encerrada para ${people(n)}`),
    icon: ShieldCheck,
    permission: "ban_accounts",
    isDanger: false,
  },
  delete: {
    label: "Excluir conta",
    title: (n) => (n === 1 ? "Excluir conta agora?" : `Excluir ${people(n)} agora?`),
    done: (n) => (n === 1 ? "Conta excluída" : `${people(n)} excluídas`),
    icon: Trash2,
    permission: "delete_accounts",
    isDanger: true,
  },
  schedule_deletion: {
    label: "Agendar exclusão",
    title: (n) => (n === 1 ? "Agendar exclusão da conta" : `Agendar a exclusão de ${people(n)}`),
    done: (n) => `Exclusão agendada para ${people(n)}`,
    icon: CalendarClock,
    permission: "delete_accounts",
    isDanger: true,
  },
  cancel_deletion: {
    label: "Cancelar exclusão agendada",
    title: (n) => (n === 1 ? "Cancelar a exclusão agendada?" : `Cancelar a exclusão agendada de ${people(n)}?`),
    done: (n) => `Exclusão cancelada para ${people(n)}`,
    icon: CalendarX,
    permission: "delete_accounts",
    isDanger: false,
  },
};

/**
 * Ações oferecidas na seleção em lote. Ficam de fora as de desfazer (dependem do estado de cada conta)
 * e a redefinição de senha (só individual: cada pedido é um caso de suporte).
 */
export const BULK_ACTIONS: AccountActionKind[] = ["plan", "unlink_social", "ban", "schedule_deletion", "delete"];

/** Palavra que a equipe digita para confirmar a exclusão imediata. */
export const DELETE_CONFIRM_WORD = "EXCLUIR";

/** Alvo de uma ação: id e o nome que aparece no resultado. */
export interface AccountTarget {
  userId: string;
  label: string;
}

export interface AccountActionOutcome {
  succeeded: AccountTarget[];
  failed: Array<{ target: AccountTarget; message: string }>;
}

/** Estado da conta que decide entre suspender/encerrar e agendar/cancelar. */
export interface AccountActionState {
  isBanned: boolean;
  hasScheduledDeletion: boolean;
}

/** Ações de uma conta, na ordem do menu (o papel filtra depois). */
export function accountActionsFor({ isBanned, hasScheduledDeletion }: AccountActionState): AccountActionKind[] {
  // Conta suspensa não recebe o link de senha (o banco recusa: o link não funcionaria).
  const resetPassword: AccountActionKind[] = isBanned ? [] : ["reset_password"];
  return ["plan", "unlink_social", ...resetPassword, isBanned ? "unban" : "ban", hasScheduledDeletion ? "cancel_deletion" : "schedule_deletion", "delete"];
}
